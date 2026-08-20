from django.contrib import admin
from .models import Customer, CustomerOwner, Transaction


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ["id", "fullname", "phone", "code", "created"]
    list_display_links = ["fullname"]
    list_filter = ["code"]
    search_fields = ["fullname", "phone"]


@admin.register(CustomerOwner)
class CustomerOwnerAdmin(admin.ModelAdmin):
    list_display = ["id", "customer", "owner", "created"]
    search_fields = ["customer__fullname", "owner__fullname"]
    # بدون این، هر ردیفِ فهرست دو کوئریِ اضافه برای مشتری و مالک می‌زند
    list_select_related = ["customer", "owner"]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ["id", "customer", "owner", "debt", "paid", "year", "month", "day"]
    list_filter = ["year", "month"]
    search_fields = ["customer__fullname", "owner__fullname"]
    list_select_related = ["customer", "owner"]
