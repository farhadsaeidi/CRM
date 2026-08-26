from django.contrib import admin

from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ["role", "body", "tools_used", "suggestion", "created"]
    can_delete = False


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["title", "owner", "updated", "created"]
    list_filter = ["updated"]
    search_fields = ["title", "owner__phone", "owner__fullname"]
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["conversation", "role", "created"]
    list_filter = ["role", "created"]
    search_fields = ["body"]
    readonly_fields = ["conversation", "role", "body", "tools_used", "suggestion", "created"]
