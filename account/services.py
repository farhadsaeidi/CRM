"""سرویس پیامک — تنها نقطه‌ای که با کاوه‌نگار حرف می‌زند.

ویوها مستقیم به SDK دست نمی‌زنند تا حالت توسعه، تایم‌اوت و ثبت لاگ یک‌جا مدیریت شود.
"""
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout

from django.conf import settings
from rest_framework import status

from .models import SMSLog

SITE_NAME = "سامانه مدیریت مشتریان"

# حداکثر زمانِ انتظار برای پاسخِ کاوه‌نگار (SDK نصب‌شده timeout ندارد؛ خودمان سقف می‌گذاریم)
SMS_SEND_TIMEOUT_SECONDS = 15


class OtpSendError(Exception):
    """خطای ارسال پیامک، همراه با کد وضعیتی که باید به کلاینت برگردد"""

    def __init__(self, message, status_code):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _dev_mode():
    return bool(getattr(settings, "SMS_DEV_MODE", settings.DEBUG))


def _api_key():
    return str(getattr(settings, "KAVENEGAR_API_KEY", "")).strip()


def _run_with_timeout(func, params):
    """اجرا در تردِ جدا تا اگر فرآیندِ ارسال طولانی شد، با پیغامِ مناسب قطع شود"""
    pool = ThreadPoolExecutor(max_workers=1)
    try:
        return pool.submit(func, params).result(timeout=SMS_SEND_TIMEOUT_SECONDS)
    finally:
        pool.shutdown(wait=False)


def send_sms(phone, body, event=""):
    """ارسال پیامک ساده با ثبت لاگ. در حالت توسعه فقط لاگ می‌شود.

    عمداً استثنا پرتاب نمی‌کند: پیامکِ اطلاع‌رسانی نباید فرآیند اصلی را بشکند.
    """
    if _dev_mode() or not _api_key():
        SMSLog.objects.create(to_phone=phone, body=body, event=event, status=SMSLog.SendStatus.DEV)
        return True
    try:
        from kavenegar import KavenegarAPI
        api = KavenegarAPI(_api_key())
        _run_with_timeout(api.sms_send, {"receptor": phone, "message": body})
        SMSLog.objects.create(to_phone=phone, body=body, event=event, status=SMSLog.SendStatus.SENT)
        return True
    except Exception as exc:  # noqa: BLE001 — خطای پیامک نباید فرایند اصلی را بشکند
        SMSLog.objects.create(to_phone=phone, body=body, event=event,
                              status=SMSLog.SendStatus.FAILED, error=str(exc)[:300])
        return False


def send_token_sms(phone, template, token, event=""):
    """ارسال پیامکِ الگودار (verify_lookup) برای کد یکبار مصرف و رمز جدید.

    برخلاف send_sms اینجا خطا پرتاب می‌شود، چون اگر کد به دست کاربر نرسد ادامهٔ
    فرآیند بی‌معناست و باید پیام درست به او نشان داده شود.

    خودِ `token` هرگز در SMSLog ذخیره نمی‌شود — فقط اینکه چه رویدادی رخ داده.
    """
    if _dev_mode() or not _api_key():
        # حالت توسعه: کاوه‌نگار فقط به شماره‌های تاییدشدهٔ صاحب حساب ارسال دارد،
        # پس شماره‌های تست همیشه ۵۰۲ می‌گیرند و فلوی تایید غیرقابل‌آزمایش می‌شود.
        # اینجا صرفاً لاگ می‌کنیم و کد را از دیتابیس می‌شود خواند.
        SMSLog.objects.create(to_phone=phone, body=f"[{template}] ارسال شد.",
                              event=event, status=SMSLog.SendStatus.DEV)
        return True

    from kavenegar import APIException, HTTPException, KavenegarAPI

    api = KavenegarAPI(_api_key())
    params = {
        "receptor": phone,   # گیرنده
        "template": template,  # الگویی که داخل پنل کاوه‌نگار ساخته شده
        "token": token,      # کد یکبار مصرف یا رمز جدید
    }
    sender = str(getattr(settings, "KAVENEGAR_SENDER", "")).strip()
    if sender:
        params["sender"] = sender

    def _fail(message, code, error):
        SMSLog.objects.create(to_phone=phone, body=f"[{template}] ارسال ناموفق.", event=event,
                              status=SMSLog.SendStatus.FAILED, error=str(error)[:300])
        raise OtpSendError(message, code)

    try:
        _run_with_timeout(api.verify_lookup, params)
    except FutureTimeout as exc:
        _fail("ارسال پیامک بیش از حد طول کشید. لطفاً دوباره تلاش کنید.",
              status.HTTP_504_GATEWAY_TIMEOUT, exc)
    except APIException as exc:
        _fail("امکان ارسال پیامک وجود ندارد. لطفاً کمی بعد دوباره تلاش کنید.",
              status.HTTP_502_BAD_GATEWAY, exc)
    except HTTPException as exc:
        _fail("ارتباط با سرویس ارسال پیامک برقرار نشد. لطفاً دوباره تلاش کنید.",
              status.HTTP_503_SERVICE_UNAVAILABLE, exc)

    SMSLog.objects.create(to_phone=phone, body=f"[{template}] ارسال شد.",
                          event=event, status=SMSLog.SendStatus.SENT)
    return True
