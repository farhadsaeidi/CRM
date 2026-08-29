from rest_framework import serializers

from .catalog import resolve as resolve_model
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

    def validate_model(self, value):
        """⚠️ فهرستِ سفید اینجا هم لازم است، نه فقط سرِ راهِ ارسالِ پیام.

        این سریالایزر `PATCH` روی خودِ گفتگو را هم اداره می‌کند، پس بدونِ این
        تابع می‌شد با یک درخواستِ ساده هر رشته‌ای در ستون نشاند. موتور موقعِ
        جواب دادن باز هم `resolve` می‌زند و به ارائه‌دهنده نمی‌رسد، ولی آن وقت
        کشو مدلی را نشان می‌داد که هیچ‌وقت جواب نمی‌دهد.
        """
        return resolve_model(value)

    class Meta:
        model = Conversation
        fields = ["id", "title", "created", "updated", "message_count", "model"]
        read_only_fields = ["id", "created", "updated", "message_count"]


class ConversationDetailSerializer(ConversationSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + ["messages"]
