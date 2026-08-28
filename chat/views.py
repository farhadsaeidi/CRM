import logging

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response

from core.permissions import IsOwner

from .engine import EngineError, EngineNotConfigured, answer, is_configured
from .models import Conversation
from .serializers import ConversationDetailSerializer, ConversationSerializer, MessageSerializer

logger = logging.getLogger(__name__)


class OwnerScopedMixin:
    """همان قاعدهٔ `home/views.py`: هر ویو خودش دامنه را به مالکِ درخواست می‌بندد.

    گفتگو محتوای خصوصیِ مالک است — شاید خصوصی‌تر از خودِ دفتر، چون سوال‌هایی که
    آدم از دستیارش می‌پرسد نیت و نگرانی‌اش را لو می‌دهد. پس اینجا هم شناسهٔ
    مالکِ دیگر ۴۰۴ می‌گیرد نه ۴۰۳.
    """
    permission_classes = [IsOwner]

    def owner_conversations(self):
        return Conversation.objects.filter(owner=self.request.user)


class ConversationListCreateView(OwnerScopedMixin, generics.ListCreateAPIView):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return self.owner_conversations()

    def perform_create(self, serializer):
        # مالک از سشن می‌آید نه از بدنهٔ درخواست — کلاینت اصلاً نمی‌تواند
        # گفتگویی به نامِ دیگری بسازد
        serializer.save(owner=self.request.user)


class ConversationDetailView(OwnerScopedMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ConversationDetailSerializer

    def get_queryset(self):
        return self.owner_conversations().prefetch_related("messages")

    def destroy(self, request, *args, **kwargs):
        super().destroy(request, *args, **kwargs)
        return Response({"message": "گفتگو حذف شد."}, status=status.HTTP_200_OK)


# noinspection PyMethodMayBeStatic
class MessageCreateView(OwnerScopedMixin, generics.GenericAPIView):
    """ارسالِ پیامِ کاربر و گرفتنِ پاسخِ دستیار.

    ⚠️ پاسخ **همزمان** ساخته می‌شود، نه در صف. مدلِ محلی روی CPU چند ده ثانیه
    طول می‌کشد و کلاینت منتظر می‌ماند؛ برای یک کاربرِ تنها قابلِ قبول است و
    استریم کردنش کارِ فاز بعد است. با چند کاربرِ همزمان باید به صف برود.
    """
    serializer_class = ConversationDetailSerializer

    def post(self, request, pk):
        conversation = get_object_or_404(self.owner_conversations(), pk=pk)
        body = str(request.data.get("body", "")).strip()
        if not body:
            return Response({"message": "متن پیام خالی است."}, status=status.HTTP_400_BAD_REQUEST)

        first = not conversation.messages.exists()
        user_message = conversation.messages.create(role="user", body=body)

        # عنوانِ گفتگو از اولین پیام ساخته می‌شود — بدونِ فراخوانیِ جدا به مدل
        fields = ["updated"]
        if first:
            conversation.title = body[:60]
            fields.append("title")
        conversation.updated = timezone.now()
        conversation.save(update_fields=fields)

        assistant = None
        error = None
        if is_configured():
            try:
                text, used = answer(request.user, conversation)
                assistant = conversation.messages.create(
                    role="assistant", body=text, tools_used=used,
                )
            except EngineNotConfigured as exc:
                error = str(exc)
            except EngineError as exc:
                # ⚠️ پیامِ کاربر پاک نمی‌شود: او حرفش را زده و باید ببیندش.
                # فقط پاسخ نیامده، که خودش را صریح می‌گوییم.
                logger.exception("chat engine failed")
                error = str(exc)
        else:
            error = "دستیار هنوز پیکربندی نشده است."

        return Response(
            {"userMessage": MessageSerializer(user_message).data,
             "assistantMessage": MessageSerializer(assistant).data if assistant else None,
             "error": error,
             "title": conversation.title},
            status=status.HTTP_201_CREATED,
        )
