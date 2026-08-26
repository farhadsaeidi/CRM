import re
from secrets import choice, randbelow
from django.core.cache import cache
from django.contrib.auth import authenticate, login, logout, get_user_model, update_session_auth_hash
from django.db import transaction
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import ParseError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from .serializers import ProfileUpdateSerializer, UserSerializer
from .services import OtpSendError, send_token_sms


User = get_user_model()

OTP_EXPIRY_SECONDS = 120
OTP_LENGTH = 5
OTP_MAX_ATTEMPTS = 5

# اعتبارسنجی شماره موبایل ایرانی (با پیش‌شماره اپراتورهای معتبر)
PHONE_REGEX = re.compile(r"^09(0[1-5]|1[0-9]|2[0-2]|3[035-9]|9[0-9])\d{7}$")
# جدول تبدیل ارقام فارسی و عربی به انگلیسی
DIGIT_TRANSLATION_TABLE = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
# جدول تبدیل ارقام انگلیسی به فارسی برای نمایش در پیام‌ها
PERSIAN_DIGIT_TRANSLATION_TABLE = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
# الفبای رمزِ جدیدِ فراموشی رمز — حروفِ مبهم (l، I، O، 0، 1) عمداً نیست
FORGET_PASS_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#"


# تبدیل ارقام فارسی/عربی به انگلیسی
def normalize_digits(value):
    if not isinstance(value, str):
        return ""
    return value.translate(DIGIT_TRANSLATION_TABLE)


# تبدیل ارقام انگلیسی به فارسی برای متن‌های نمایشی
def to_persian_digits(value):
    return str(value).translate(PERSIAN_DIGIT_TRANSLATION_TABLE)


# تولید کد یکبار مصرف به طول OTP_LENGTH (بدون صفرِ ابتدایی، تا طولش موقع نمایش نشکند)
def generate_otp_code():
    lowest = 10 ** (OTP_LENGTH - 1)
    return f"{randbelow(9 * lowest) + lowest}"


# محاسبه زمان باقی‌مانده تا انقضای کد فعلی (بر حسب ثانیه)
def get_otp_remaining_seconds(user):
    if not user.otp_time:
        return 0
    elapsed = int((timezone.now() - user.otp_time).total_seconds())
    return max(0, OTP_EXPIRY_SECONDS - elapsed)


# نرمال‌سازی شماره همراه: تبدیل ارقام، حذف فاصله/خط‌تیره/پرانتز، تبدیل پیش‌شماره بین‌المللی به داخلی
def normalize_phone_number(phone):
    cleaned = normalize_digits(phone).strip()
    cleaned = re.sub(r"[\s\-()]", "", cleaned)
    cleaned = re.sub(r"^\+98|^0098|^98", "0", cleaned)
    return cleaned


# آیا شماره دقیقاً با الگوی موبایل ایرانی مطابقت دارد؟
def is_valid_iranian_mobile(phone):
    return bool(PHONE_REGEX.fullmatch(phone))


# noinspection PyMethodMayBeStatic
@method_decorator(ensure_csrf_cookie, name="get")
# ensure_csrf_cookie ---> اگر کوکی csrftoken در درخواست نباشد، جنگو یکی می‌سازد و با
# هدر Set-Cookie در پاسخ می‌گذارد. فرانت آن را می‌خواند و در X-CSRFToken برمی‌گرداند.
# نکته: این توکن بعد از login می‌چرخد، پس فرانت باید دوباره از کوکی بخواندش.
# name="get" ---> دکوریتور فقط روی متد گت اعمال شود، نه کل کلاس
class CSRFView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"detail": "CSRF cookie set."})


# noinspection PyMethodMayBeStatic
class MeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            return Response(UserSerializer(request.user).data)
        # برای مهمان هم ۲۰۰ برمی‌گردد نه ۴۰۱ — چون «لاگین نیستی» خطا نیست،
        # جوابِ درستِ همین سؤال است و فرانت نباید آن را در کنسول خطا ببیند.
        return Response(None)


# noinspection PyMethodMayBeStatic
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # گرفتن و بررسی دیتا از کلاینت
        try:
            data = request.data
        except ParseError:
            return Response({"message": "فرمت داده‌های ارسالی نامعتبر است."}, status=status.HTTP_400_BAD_REQUEST)
        fullname = str(data.get("fullname", "")).strip()
        phone = normalize_phone_number(data.get("phone", ""))
        address = str(data.get("address", "")).strip()
        password = str(data.get("password", ""))
        # نام و نام خانوادگی
        if len(fullname) < 3:
            return Response({"fieldErrors": {"fullname": "نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد."}}, status=status.HTTP_400_BAD_REQUEST)
        # معتبر بودن شماره همراه
        if not is_valid_iranian_mobile(phone):
            return Response({"fieldErrors": {"phone": "شماره همراه معتبر نیست."}}, status=status.HTTP_400_BAD_REQUEST)
        # آدرس در ثبت‌نام گرفته نمی‌شود — جایش صفحهٔ پروفایل است. اگر کلاینتی
        # بفرستد ذخیره می‌شود، ولی نبودش خطا نیست: در سطح مدل هم blank=True است.
        # رمز عبور
        if len(password) < 4:
            return Response({"fieldErrors": {"password": "کلمه عبور باید حداقل ۴ کاراکتر داشته باشد."}}, status=status.HTTP_400_BAD_REQUEST)
        # تکراری بودن شماره همراه
        if User.objects.filter(phone=phone).exists():
            return Response({"fieldErrors": {"phone": "این شماره همراه قبلاً در سیستم ثبت شده است."}}, status=status.HTTP_409_CONFLICT)
        try:
            with transaction.atomic():
                user = User.objects.create_user(fullname=fullname, phone=phone, password=password, address=address)
                login(request, user)
                return Response(
                    {
                        "message": "ثبت‌ نام با موفقیت انجام شد.",
                        "userData": UserSerializer(user).data
                    },
                    status=status.HTTP_201_CREATED
                )
        except Exception:
            return Response({"message": "خطای سرور! لطفاً دوباره تلاش کنید..."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# noinspection PyMethodMayBeStatic
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        # گرفتن و بررسی دیتا از کلاینت
        try:
            data = request.data  # {"username": "09121234567", "password": "1234"}
        except ParseError:
            return Response({"message": "فرمت داده‌های ارسالی نامعتبر است."}, status=status.HTTP_400_BAD_REQUEST)
        username = normalize_phone_number(data.get("username", ""))
        password = str(data.get("password", ""))
        try:
            user = authenticate(request, phone=username, password=password)
            if user is None:
                # تفکیکِ «کاربر نیست» از «رمز غلط» عمدی است تا پیام فیلدِ درست را
                # هایلایت کند. برای brute-force خطرناک نیست چون ثبت‌نام هم عمومی است
                # و وجود یک شماره از همان راه قابل کشف است؛ در عوض throttle داریم.
                existing = User.objects.filter(phone=username).first()
                if existing is None:
                    return Response({"fieldErrors": {"username": "نام کاربری اشتباه است."}}, status=status.HTTP_401_UNAUTHORIZED)
                if not existing.is_active:
                    return Response({"message": "حساب کاربری شما غیر فعال شده است."}, status=status.HTTP_403_FORBIDDEN)
                return Response({"fieldErrors": {"password": "رمز عبور اشتباه است."}}, status=status.HTTP_401_UNAUTHORIZED)
            # احراز هویت نیتیو جنگو
            login(request, user)
            return Response(
                {
                    "message": "با موفقیت وارد شدید.",
                    "userData": UserSerializer(user).data
                },
                status=status.HTTP_200_OK
            )
        except Exception:
            return Response({"message": "خطای سرور! لطفاً دوباره تلاش کنید..."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# noinspection PyMethodMayBeStatic
class OtpPhoneView(APIView):
    """درخواست کد یکبار مصرف — فقط برای کاربرانِ ثبت‌ نام ‌شده"""
    permission_classes = [AllowAny]
    throttle_scope = "otp"

    def post(self, request):
        try:
            data = request.data
        except ParseError:
            return Response({"message": "فرمت داده‌های ارسالی نامعتبر است."}, status=status.HTTP_400_BAD_REQUEST)
        phone = normalize_phone_number(data.get("otpPhone", ""))
        if not is_valid_iranian_mobile(phone):
            return Response({"fieldErrors": {"otpPhone": "شماره همراه معتبر نیست."}}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.filter(phone=phone).first()
            if not user:
                return Response({"fieldErrors": {"otpPhone": "شماره همراه وارد شده در سیستم ثبت نشده است. لطفا ثبت نام کنید."}}, status=status.HTTP_404_NOT_FOUND)
            if not user.is_active:
                return Response({"message": "حساب کاربری شما غیر فعال شده است."}, status=status.HTTP_403_FORBIDDEN)
            # اگر کد قبلی هنوز معتبر است، اجازهٔ ارسال دوباره نده (جلوگیری از ارسال پی‌درپی)
            remaining = get_otp_remaining_seconds(user)
            if user.otp and remaining > 0:
                return Response(
                    {
                        "message": "کد تایید قبلی هنوز معتبر است. لطفا اندکی صبر کنید...",
                        "remainingSeconds": remaining,
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS)
            # تولید و ذخیرهٔ کد یکبار مصرف
            otp_code = generate_otp_code()
            user.otp = int(otp_code)
            user.otp_time = timezone.now()
            user.save(update_fields=["otp", "otp_time"])
            # در صورت خطا کد ذخیره‌شده را پاک کن تا کاربر بتواند دوباره تلاش کند
            try:
                send_token_sms(phone=phone, template="crm", token=otp_code, event="otp_login")
            except OtpSendError as error:
                user.otp = None
                user.otp_time = None
                user.save(update_fields=["otp", "otp_time"])
                return Response({"message": error.message}, status=error.status_code)
            return Response({"message": f"کد تایید به شماره همراه \"{to_persian_digits(phone)}\" ارسال شد."}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"message": "خطای سرور! لطفاً دوباره تلاش کنید..."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# noinspection PyMethodMayBeStatic
class OtpConfirmView(APIView):
    """تایید کد یکبار مصرف و ورود"""
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            data = request.data
        except ParseError:
            return Response({"message": "فرمت داده‌های ارسالی نامعتبر است."}, status=status.HTTP_400_BAD_REQUEST)
        phone = normalize_phone_number(data.get("otpPhone", ""))
        code = normalize_digits(str(data.get("otpConfirm", ""))).strip()
        if not is_valid_iranian_mobile(phone):
            return Response({"fieldErrors": {"otpPhone": "شماره همراه معتبر نیست."}}, status=status.HTTP_400_BAD_REQUEST)
        if not re.fullmatch(rf"\d{{{OTP_LENGTH}}}", code):
            return Response({"fieldErrors": {"otpConfirm": f"کد تایید باید {OTP_LENGTH} رقمی باشد."}}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.filter(phone=phone).first()
            if not user:
                return Response({"fieldErrors": {"otpPhone": "شماره همراه وارد شده در سیستم ثبت نشده است."}}, status=status.HTTP_404_NOT_FOUND)
            if not user.is_active:
                return Response({"message": "حساب کاربری شما غیر فعال شده است."}, status=status.HTTP_403_FORBIDDEN)
            # کدی برای این شماره ثبت نشده یا قبلاً مصرف شده است
            if user.otp is None or user.otp_time is None:
                return Response({"fieldErrors": {"otpConfirm": "کدی برای این شماره ثبت نشده است. لطفا دوباره درخواست دهید."}}, status=status.HTTP_400_BAD_REQUEST)
            # کد منقضی شده است → باطلش کن
            if get_otp_remaining_seconds(user) <= 0:
                user.otp = None
                user.otp_time = None
                user.save(update_fields=["otp", "otp_time"])
                return Response({"fieldErrors": {"otpConfirm": "زمان کد تایید به پایان رسیده است. لطفا کد جدید بگیرید."}}, status=status.HTTP_400_BAD_REQUEST)
            # محدودیت تعداد تلاش (سمت سرور، مستقل از کوکی کاربر → مقاوم در برابر brute-force)
            attempts_key = f"otp_attempts_{phone}"
            attempts = cache.get(attempts_key, 0)
            if attempts >= OTP_MAX_ATTEMPTS:
                user.otp = None
                user.otp_time = None
                user.save(update_fields=["otp", "otp_time"])
                cache.delete(attempts_key)
                return Response({"fieldErrors": {"otpConfirm": "تعداد تلاش‌های مجاز به پایان رسید. لطفا کد جدید بگیرید."}}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            # کد اشتباه است → شمارش تلاش ناموفق
            if code != str(user.otp).zfill(OTP_LENGTH):
                cache.set(attempts_key, attempts + 1, timeout=OTP_EXPIRY_SECONDS)
                return Response({"fieldErrors": {"otpConfirm": "کد تایید وارد شده صحیح نیست."}}, status=status.HTTP_401_UNAUTHORIZED)
            # موفق: کد یکبار مصرف باطل و کاربر وارد می‌شود
            user.otp = None
            user.otp_time = None
            user.save(update_fields=["otp", "otp_time"])
            cache.delete(attempts_key)
            login(request, user)
            return Response(
                {
                    "message": "با موفقیت وارد شدید.",
                    "userData": UserSerializer(user).data
                },
                status=status.HTTP_200_OK
            )
        except Exception:
            return Response({"message": "خطای سرور! لطفاً دوباره تلاش کنید..."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# noinspection PyMethodMayBeStatic
class ForgetPasswordView(APIView):
    """ارسال رمز عبور جدید با پیامک"""
    permission_classes = [AllowAny]
    throttle_scope = "otp"

    def post(self, request):
        try:
            data = request.data
        except ParseError:
            return Response({"message": "فرمت داده‌های ارسالی نامعتبر است."}, status=status.HTTP_400_BAD_REQUEST)
        phone = normalize_phone_number(data.get("otpPhone", ""))
        if not is_valid_iranian_mobile(phone):
            return Response({"fieldErrors": {"otpPhone": "شماره همراه معتبر نیست."}}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.filter(phone=phone).first()
            if not user:
                return Response({"fieldErrors": {"otpPhone": "شماره همراه وارد شده در سیستم ثبت نشده است."}}, status=status.HTTP_404_NOT_FOUND)
            if not user.is_active:
                return Response({"message": "حساب کاربری شما غیر فعال شده است."}, status=status.HTTP_403_FORBIDDEN)
            token = "".join(choice(FORGET_PASS_ALPHABET) for _ in range(6))
            # اول ارسالِ پیامک، بعد تغییرِ رمز — اگر ارسال بشکند کاربر با رمزِ قبلی
            # می‌ماند. برعکسش یعنی قفل‌شدنِ کاربر بیرونِ حسابِ خودش.
            try:
                send_token_sms(phone=phone, template="crm-forget-password", token=token, event="forget_password")
            except OtpSendError as error:
                return Response({"message": error.message}, status=error.status_code)
            user.set_password(token)
            user.save(update_fields=["password"])
            return Response({"message": f"رمز عبور جدید به شماره همراه \"{to_persian_digits(phone)}\" ارسال شد."},
                            status=status.HTTP_200_OK)
        except Exception:
            return Response({"message": "خطای سرور! لطفاً دوباره تلاش کنید..."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# noinspection PyMethodMayBeStatic
# noinspection PyMethodMayBeStatic
class ProfileView(APIView):
    """ویرایشِ پروفایلِ کاربرِ واردشده (پیش‌فرضِ DRF یعنی IsAuthenticated).

    ⚠️ `MultiPartParser` لازم است: پیش‌فرضِ پروژه فقط JSON است و بدونِ این، آپلودِ
    تصویرِ پروفایل با ۴۱۵ رد می‌شود.
    """
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            "message": "پروفایل با موفقیت به‌روزرسانی شد.",
            "userData": UserSerializer(request.user).data,
        })


class ChangePasswordView(APIView):
    """تغییر رمز عبور توسط کاربرِ واردشده (پیش‌فرضِ DRF یعنی IsAuthenticated)"""

    def post(self, request):
        old = str(request.data.get("old_password", ""))
        new = str(request.data.get("new_password", ""))
        if not request.user.check_password(old):
            return Response({"fieldErrors": {"old_password": "رمز عبور فعلی اشتباه است."}},
                            status=status.HTTP_400_BAD_REQUEST)
        if len(new) < 4:
            return Response({"fieldErrors": {"new_password": "رمز جدید باید حداقل ۴ کاراکتر داشته باشد."}},
                            status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new)
        request.user.save(update_fields=["password"])
        # بدون این، تغییرِ رمز سشنِ خودِ کاربر را هم باطل می‌کند و بلافاصله بیرون می‌افتد
        update_session_auth_hash(request, request.user)
        return Response({"message": "تغییر رمز عبور با موفقیت انجام شد."})


# noinspection PyMethodMayBeStatic
class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            logout(request)
            return Response({"message": "با موفقیت خارج شدید."}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"message": "خطای سرور! لطفاً دوباره تلاش کنید..."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
