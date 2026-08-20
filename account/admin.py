from django.contrib import admin
from .models import MyUser


@admin.register(MyUser)
class MyUserAdmin(admin.ModelAdmin):
    list_display = ["id", "fullname", "phone", "role", "is_active", "created"]
    list_display_links = ["fullname"]
    list_filter = ["role", "is_active"]
    search_fields = ["fullname", "phone"]
