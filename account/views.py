import re
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.db import transaction
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import ParseError
from .serializers import UserSerializer


User = get_user_model()

# اعتبارسنجی شماره موبایل ایرانی (با پیش‌شماره اپراتورهای معتبر)
PHONE_REGEX = re.compile(r"^09(0[1-5]|1[0-9]|2[0-2]|3[035-9]|9[0-9])\d{7}$")
# جدول تبدیل ارقام فارسی و عربی به انگلیسی
DIGIT_TRANSLATION_TABLE = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")


# تبدیل ارقام فارسی/عربی به انگلیسی
def normalize_digits(value):
    if not isinstance(value, str):
        return ""
    return value.translate(DIGIT_TRANSLATION_TABLE)


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
        password = str(data.get("password", ""))
        # نام و نام خانوادگی
        if len(fullname) < 3:
            return Response({"fieldErrors": {"fullname": "نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد."}}, status=status.HTTP_400_BAD_REQUEST)
        # معتبر بودن شماره همراه
        if not is_valid_iranian_mobile(phone):
            return Response({"fieldErrors": {"phone": "شماره همراه معتبر نیست."}}, status=status.HTTP_400_BAD_REQUEST)
        # رمز عبور
        if len(password) < 4:
            return Response({"fieldErrors": {"password": "کلمه عبور باید حداقل ۴ کاراکتر داشته باشد."}}, status=status.HTTP_400_BAD_REQUEST)
        # تکراری بودن شماره همراه
        if User.objects.filter(phone=phone).exists():
            return Response({"fieldErrors": {"phone": "این شماره همراه قبلاً در سیستم ثبت شده است."}}, status=status.HTTP_409_CONFLICT)
        try:
            with transaction.atomic():
                user = User.objects.create_user(fullname=fullname, phone=phone, password=password)
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
class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            logout(request)
            return Response({"message": "با موفقیت خارج شدید."}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"message": "خطای سرور! لطفاً دوباره تلاش کنید..."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
