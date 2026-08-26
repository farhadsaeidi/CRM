"""احراز هویت — ثبت‌نام، ورود، کد یکبارمصرف و تغییرِ رمز.

⚠️ همهٔ تست‌ها با `SMS_DEV_MODE=True` اجرا می‌شوند: هیچ پیامکی واقعاً ارسال
نمی‌شود و فقط در `SMSLog` ثبت می‌گردد.
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from account.models import SMSLog
from account.views import OTP_EXPIRY_SECONDS, OTP_MAX_ATTEMPTS

User = get_user_model()


@override_settings(SMS_DEV_MODE=True)
class RegisterLoginTests(APITestCase):
    def test_register_creates_an_owner_and_logs_them_in(self):
        """آدرس در ثبت‌نام گرفته نمی‌شود؛ جایش صفحهٔ پروفایل است."""
        response = self.client.post(reverse("api:register"), {
            "fullname": "کاربر تازه", "phone": "09121234567", "password": "test1234",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(phone="09121234567").exists())

        me = self.client.get(reverse("api:me")).json()
        self.assertEqual(me["phone"], "09121234567")

    def test_register_normalises_persian_digits_and_country_code(self):
        self.client.post(reverse("api:register"), {
            "fullname": "کاربر فارسی", "phone": "+۹۸۹۱۲۱۱۱۲۲۳۳", "password": "test1234",
        }, format="json")
        self.assertTrue(User.objects.filter(phone="09121112233").exists())

    def test_duplicate_phone_is_rejected(self):
        User.objects.create_user(fullname="اولی", phone="09121234567", password="test1234")
        response = self.client.post(reverse("api:register"), {
            "fullname": "دومی", "phone": "09121234567", "password": "test1234",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_login_logout_and_me(self):
        User.objects.create_user(fullname="کاربر", phone="09121234567", password="test1234")

        # مهمان ۲۰۰ با بدنهٔ خالی می‌گیرد، نه ۴۰۱: «لاگین نیستی» خطا نیست،
        # جوابِ درستِ همین سؤال است و فرانت نباید آن را در کنسول خطا ببیند
        anonymous = self.client.get(reverse("api:me"))
        self.assertEqual(anonymous.status_code, status.HTTP_200_OK)
        self.assertFalse(anonymous.content)

        response = self.client.post(reverse("api:login"),
                                    {"username": "09121234567", "password": "test1234"},
                                    format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(reverse("api:me")).json()["fullname"], "کاربر")

        self.client.post(reverse("api:logout"))
        self.assertFalse(self.client.get(reverse("api:me")).content)

    def test_login_separates_unknown_user_from_wrong_password(self):
        User.objects.create_user(fullname="کاربر", phone="09121234567", password="test1234")

        unknown = self.client.post(reverse("api:login"),
                                   {"username": "09129999999", "password": "x"}, format="json")
        self.assertIn("username", unknown.json()["fieldErrors"])

        wrong = self.client.post(reverse("api:login"),
                                 {"username": "09121234567", "password": "wrong"}, format="json")
        self.assertIn("password", wrong.json()["fieldErrors"])

    def test_inactive_account_is_told_apart(self):
        User.objects.create_user(fullname="غیرفعال", phone="09121234567",
                                 password="test1234", is_active=False)
        response = self.client.post(reverse("api:login"),
                                    {"username": "09121234567", "password": "test1234"},
                                    format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_short_password_of_an_existing_user_still_logs_in(self):
        """رمزِ کاربرانِ قدیمی ۳ کاراکتر است؛ حداقلِ طول فقط جای *ساختن* رمز است."""
        User.objects.create_user(fullname="قدیمی", phone="09121234567", password="abc")
        response = self.client.post(reverse("api:login"),
                                    {"username": "09121234567", "password": "abc"},
                                    format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


@override_settings(SMS_DEV_MODE=True)
class OtpTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            fullname="کاربر", phone="09121234567", password="test1234",
        )

    def request_code(self):
        return self.client.post(reverse("api:otp_phone"), {"otpPhone": "09121234567"}, format="json")

    def confirm(self, code):
        return self.client.post(reverse("api:otp_confirm"),
                                {"otpPhone": "09121234567", "otpConfirm": code}, format="json")

    def test_requesting_a_code_stores_it_and_logs_the_send(self):
        self.assertEqual(self.request_code().status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(len(str(self.user.otp)), 5)
        self.assertTrue(SMSLog.objects.exists())

    def test_the_code_itself_is_never_written_to_the_log(self):
        """این جدول از پنل ادمین خواندنی است و نباید به کلیدِ ورود تبدیل شود."""
        self.request_code()
        self.user.refresh_from_db()
        for log in SMSLog.objects.all():
            self.assertNotIn(str(self.user.otp), log.body)

    def test_correct_code_logs_the_user_in_and_burns_the_code(self):
        self.request_code()
        self.user.refresh_from_db()
        response = self.confirm(str(self.user.otp))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(reverse("api:me")).json()["phone"], "09121234567")

        self.user.refresh_from_db()
        self.assertFalse(self.user.otp)

    def test_persian_digits_in_the_code_are_accepted(self):
        self.request_code()
        self.user.refresh_from_db()
        persian = str(self.user.otp).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))
        self.assertEqual(self.confirm(persian).status_code, status.HTTP_200_OK)

    def test_expired_code_is_refused(self):
        self.request_code()
        self.user.refresh_from_db()
        code = str(self.user.otp)
        self.user.otp_time = timezone.now() - timezone.timedelta(seconds=OTP_EXPIRY_SECONDS + 5)
        self.user.save(update_fields=["otp_time"])
        self.assertEqual(self.confirm(code).status_code, status.HTTP_400_BAD_REQUEST)

    def test_attempts_are_counted_on_the_server_and_run_out(self):
        """شمارش در cache است نه کوکی، تا با پاک کردنِ کوکی دور نخورد."""
        self.request_code()
        for _ in range(OTP_MAX_ATTEMPTS):
            self.assertEqual(self.confirm("00000").status_code, status.HTTP_401_UNAUTHORIZED)

        blocked = self.confirm("00000")
        self.assertEqual(blocked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        self.user.refresh_from_db()
        self.assertFalse(self.user.otp)

    def test_asking_again_while_a_code_is_alive_is_throttled(self):
        self.request_code()
        second = self.request_code()
        self.assertEqual(second.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("remainingSeconds", second.json())

    def test_unknown_phone_is_404(self):
        response = self.client.post(reverse("api:otp_phone"),
                                    {"otpPhone": "09129999999"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


@override_settings(SMS_DEV_MODE=True)
class PasswordTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            fullname="کاربر", phone="09121234567", password="oldpass",
        )

    def test_change_password_keeps_the_session_alive(self):
        """بدون update_session_auth_hash کاربر بلافاصله از سشنِ خودش بیرون می‌افتد."""
        self.client.force_login(self.user)
        response = self.client.post(reverse("api:change_password"),
                                    {"old_password": "oldpass", "new_password": "newpass"},
                                    format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(self.client.get(reverse("api:me")).content)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpass"))

    def test_change_password_rejects_a_wrong_current_password(self):
        self.client.force_login(self.user)
        response = self.client.post(reverse("api:change_password"),
                                    {"old_password": "wrong", "new_password": "newpass"},
                                    format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("oldpass"))

    def test_change_password_requires_login(self):
        response = self.client.post(reverse("api:change_password"),
                                    {"old_password": "oldpass", "new_password": "newpass"},
                                    format="json")
        self.assertIn(response.status_code,
                      (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_forget_password_replaces_the_password_and_logs_the_send(self):
        response = self.client.post(reverse("api:forget_password"),
                                    {"otpPhone": "09121234567"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertFalse(self.user.check_password("oldpass"))
        self.assertTrue(SMSLog.objects.exists())

    def test_forget_password_never_logs_the_new_password(self):
        self.client.post(reverse("api:forget_password"), {"otpPhone": "09121234567"}, format="json")
        for log in SMSLog.objects.all():
            self.assertNotIn("password", log.body.lower())
            # طولِ رمزِ ساخته‌شده مشخص نیست، پس صرفِ نبودِ کلیدواژه کافی نیست:
            # قرارداد این است که فقط نامِ الگو و رویداد ثبت شود
            self.assertLess(len(log.body), 200)


@override_settings(SMS_DEV_MODE=True)
class ProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            fullname="کاربر", phone="09121234567", password="test1234", address="تهران",
        )
        self.client.force_login(self.user)
        self.url = reverse("api:profile")

    def test_updating_name_and_address(self):
        response = self.client.patch(self.url,
                                     {"fullname": "نامِ تازه", "address": "شیراز"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["userData"]["fullname"], "نامِ تازه")

        self.user.refresh_from_db()
        self.assertEqual(self.user.address, "شیراز")

    def test_address_may_be_cleared(self):
        response = self.client.patch(self.url, {"address": ""}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.address, "")

    def test_short_name_is_rejected(self):
        response = self.client.patch(self.url, {"fullname": "ال"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertEqual(self.user.fullname, "کاربر")

    def test_phone_cannot_be_changed_from_the_profile(self):
        """شماره همان نامِ کاربریِ ورود است و در سریالایزرِ ویرایش نیست."""
        self.client.patch(self.url, {"phone": "09129999999"}, format="json")
        self.user.refresh_from_db()
        self.assertEqual(self.user.phone, "09121234567")

    def test_role_cannot_be_escalated_from_the_profile(self):
        self.client.patch(self.url, {"role": "superuser"}, format="json")
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, "owner")

    def test_profile_requires_login(self):
        self.client.logout()
        response = self.client.patch(self.url, {"fullname": "مهمان"}, format="json")
        self.assertIn(response.status_code,
                      (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_one_user_cannot_edit_another(self):
        """endpoint اصلاً شناسه نمی‌گیرد — همیشه روی request.user کار می‌کند."""
        other = User.objects.create_user(
            fullname="دیگری", phone="09121112233", password="test1234",
        )
        self.client.patch(self.url, {"fullname": "دستکاری شده"}, format="json")
        other.refresh_from_db()
        self.assertEqual(other.fullname, "دیگری")
