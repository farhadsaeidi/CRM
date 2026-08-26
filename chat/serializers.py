from rest_framework import serializers

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "role", "body", "tools_used", "suggestion", "created"]
        read_only_fields = fields


class ConversationSerializer(serializers.ModelSerializer):
    """فهرستِ کناری — بدونِ پیام‌ها.

    آوردنِ پیام‌ها در فهرست یعنی با ده گفتگو، کلِ تاریخچه در هر بار باز شدنِ صفحه
    منتقل می‌شود؛ در حالی که کاربر فقط یکی را باز می‌کند.
    """
    message_count = serializers.IntegerField(source="messages.count", read_only=True)

    class Meta:
        model = Conversation
        fields = ["id", "title", "created", "updated", "message_count"]
        read_only_fields = ["id", "created", "updated", "message_count"]


class ConversationDetailSerializer(ConversationSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + ["messages"]
