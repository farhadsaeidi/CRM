import json
import logging

from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response

from core.permissions import IsOwner

from .engine import EngineError, EngineNotConfigured, answer, answer_stream, is_configured
from .models import Conversation
from .suggestions import build_suggestions
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
                    suggestion=build_suggestions(used),
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


def _sse(event, data):
    """یک رویدادِ SSE.

    ensure_ascii=False لازم است، وگرنه فارسی به اسکیپِ یونیکد می‌رود و حجمِ هر
    تکه چند برابر می‌شود — روی جریانی که حرف‌به‌حرف می‌آید، محسوس است.
    """
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


# noinspection PyMethodMayBeStatic
class MessageStreamView(OwnerScopedMixin, generics.GenericAPIView):
    """همان ارسالِ پیام، ولی پاسخ حرف‌به‌حرف می‌آید.

    ⚠️ چرا endpointِ جدا و نه یک پارامتر روی همان قبلی؟ شکلِ پاسخ **کاملاً** فرق
    می‌کند: آنجا یک JSON است و اینجا یک جریانِ SSE. یک ویو با دو شکلِ خروجی یعنی
    کلاینت باید حدس بزند چه چیزی گرفته.

    ویوِ غیراستریم حذف نشد: تست‌ها از آن استفاده می‌کنند، و اگر روزی استریم پشتِ
    یک پراکسیِ بافرکننده بشکند، همان مسیرِ ساده هنوز کار می‌کند.
    """
    serializer_class = ConversationDetailSerializer

    def post(self, request, pk):
        conversation = get_object_or_404(self.owner_conversations(), pk=pk)
        body = str(request.data.get("body", "")).strip()
        if not body:
            return Response({"message": "متن پیام خالی است."}, status=status.HTTP_400_BAD_REQUEST)

        first = not conversation.messages.exists()
        user_message = conversation.messages.create(role="user", body=body)
        fields = ["updated"]
        if first:
            conversation.title = body[:60]
            fields.append("title")
        conversation.updated = timezone.now()
        conversation.save(update_fields=fields)

        response = StreamingHttpResponse(
            self._events(request.user, conversation, user_message),
            content_type="text/event-stream",
        )
        # بدونِ این‌ها پراکسی یا مرورگر جریان را بافر می‌کند و همه‌چیز یکجا
        # می‌رسد — یعنی دقیقاً همان رفتاری که می‌خواستیم از آن فرار کنیم
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response

    def _events(self, user, conversation, user_message):
        yield _sse("start", {
            "userMessage": MessageSerializer(user_message).data,
            "title": conversation.title,
        })

        if not is_configured():
            yield _sse("error", {"error": "دستیار هنوز پیکربندی نشده است."})
            return

        try:
            for kind, payload in answer_stream(user, conversation):
                if kind == "delta":
                    yield _sse("delta", {"text": payload})
                elif kind == "tool":
                    yield _sse("tool", {"name": payload})
                elif kind == "reset":
                    # متنِ خامِ یک فراخوانیِ ابزار روی صفحه رفته بود؛ فرانت
                    # باید آنچه تا حالا نوشته را دور بریزد
                    yield _sse("reset", {})
                elif kind == "done":
                    text, used, context = payload
                    assistant = conversation.messages.create(
                        role="assistant", body=text, tools_used=used,
                        suggestion=build_suggestions(used, context),
                    )
                    yield _sse("done", {"assistantMessage": MessageSerializer(assistant).data})
        except EngineNotConfigured as exc:
            yield _sse("error", {"error": str(exc)})
        except EngineError as exc:
            logger.exception("chat stream failed")
            yield _sse("error", {"error": str(exc)})
        except Exception as exc:  # noqa: BLE001
            # ⚠️ استثنای فرارِ داخلِ ژنراتور، جریان را بی‌صدا نصفه می‌گذارد و
            # کلاینت تا ابد منتظر می‌ماند. پس همه‌چیز اینجا گرفته می‌شود.
            logger.exception("chat stream crashed")
            yield _sse("error", {"error": f"خطای غیرمنتظره: {exc}"})
