from django.contrib import admin
from .models import MyUser, SMSLog


@admin.register(MyUser)
class MyUserAdmin(admin.ModelAdmin):
    list_display = ["id", "fullname", "phone", "role", "is_active", "created"]
    list_display_links = ["fullname"]
    list_filter = ["role", "is_active"]
    search_fields = ["fullname", "phone"]


@admin.register(SMSLog)
class SMSLogAdmin(admin.ModelAdmin):
    list_display = ["id", "to_phone", "event", "status", "created"]
    list_filter = ["status", "event"]
    search_fields = ["to_phone", "body"]
    # لاگ فقط برای رهگیری است؛ ویرایش دستی‌اش معنایی ندارد و اعتبارش را می‌بَرد
    readonly_fields = ["to_phone", "body", "event", "status", "error", "created"]

    def has_add_permission(self, request):
        return False
