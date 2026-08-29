import json
import logging
import queue
import threading

from django.db import connections
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsOwner

from .catalog import choices as model_choices, default_model, resolve as resolve_model
from .engine import EngineError, EngineNotConfigured, answer, answer_stream, is_configured
from .models import Conversation, Message
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
class ModelListView(APIView):
    """مدل‌هایی که کشوی صفحهٔ گفتگو نشان می‌دهد.

    ⚠️ فهرست از سرور می‌آید نه از کدِ فرانت. اگر در فرانت هاردکد می‌شد، دو
    نسخه از یک حقیقت داشتیم و روزی که مدلی از فهرستِ سفیدِ سرور برداشته شود،
    کشو همچنان نشانش می‌داد و انتخابش بی‌صدا به پیش‌فرض برمی‌گشت.
    """
    permission_classes = [IsOwner]

    def get(self, request):
        return Response({"models": model_choices(), "default": default_model()})


def _apply_model(conversation, requested, fields):
    """مدلِ انتخاب‌شده را روی گفتگو می‌نشاند، اگر عوض شده باشد.

    ⚠️ `resolve` همیشه صدا زده می‌شود، حتی وقتی کلاینت چیزی نفرستاده — همان جایی
    است که فهرستِ سفید اعمال می‌شود و رشتهٔ دلخواهِ کلاینت رد می‌شود.
    """
    if requested is None:
        return
    chosen = resolve_model(requested)
    if chosen != conversation.model:
        conversation.model = chosen
        fields.append("model")


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
        _apply_model(conversation, request.data.get("model"), fields)
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


class MessageActionMixin(OwnerScopedMixin):
    """پیدا کردنِ یک پیامِ کاربر در گفتگوی مالک.

    ⚠️ **هر دو شناسه اسکوپ می‌شوند، نه فقط گفتگو.** اگر `message_id` را بی‌قید
    می‌گرفتیم، شناسهٔ پیامی از گفتگوی مالکِ دیگر می‌توانست اینجا اثر بگذارد.
    """
    serializer_class = ConversationDetailSerializer

    def target(self, request, pk):
        conversation = get_object_or_404(self.owner_conversations(), pk=pk)
        message = get_object_or_404(
            Message.objects.filter(conversation=conversation),
            pk=request.data.get("message_id"),
        )
        return conversation, message


# noinspection PyMethodMayBeStatic
class MessageRewindView(MessageActionMixin, generics.GenericAPIView):
    """«بازگشت به اینجا» — این پیام و هرچه بعدش آمده حذف می‌شود.

    متنِ همان پیام برگردانده می‌شود تا فرانت آن را در کادرِ نوشتن بگذارد: کاربر
    برای **عوض کردنِ** سوالش برگشته، پس دوباره تایپ کردنش کارِ بیهوده است.

    ⚠️ فقط از روی پیامِ **کاربر** کار می‌کند. بازگشت به یک پاسخِ دستیار یعنی
    نگه‌داشتنِ سوالی که جوابش پاک شده — حالتی که هیچ‌کس نمی‌خواهد.
    """

    def post(self, request, pk):
        conversation, message = self.target(request, pk)
        if message.role != Message.Role.USER:
            return Response({"message": "بازگشت فقط از روی پیام خودتان ممکن است."},
                            status=status.HTTP_400_BAD_REQUEST)

        # شناسه‌ها در یک گفتگو صعودی‌اند و `ordering` هم روی (created, id) است،
        # پس «از اینجا به بعد» با یک شرطِ ساده به دست می‌آید.
        conversation.messages.filter(id__gte=message.id).delete()
        conversation.touch()
        return Response({"body": message.body,
                         "conversation": self.get_serializer(conversation).data})


# noinspection PyMethodMayBeStatic
class MessageForkView(MessageActionMixin, generics.GenericAPIView):
    """«انشعاب از اینجا» — گفتگوی تازه‌ای با تاریخچه تا همین پیام.

    گفتگوی اصلی **دست نمی‌خورد**. فرقش با «بازگشت» همین است: آنجا مسیر را عوض
    می‌کنی، اینجا مسیرِ دومی باز می‌کنی و اولی سرِ جایش می‌ماند.
    """

    def post(self, request, pk):
        conversation, message = self.target(request, pk)
        rows = list(conversation.messages.filter(id__lte=message.id))

        fork = Conversation.objects.create(
            owner=request.user,
            title=conversation.title,
            # مدلِ انتخاب‌شده هم می‌آید: انشعاب یعنی ادامهٔ همان گفتگو در مسیرِ
            # دیگر، و با مدلِ دیگر دیگر مقایسه‌پذیر نیست.
            model=conversation.model,
        )
        Message.objects.bulk_create([
            Message(conversation=fork, role=row.role, body=row.body,
                    tools_used=row.tools_used, suggestion=row.suggestion,
                    created=row.created)
            for row in rows
        ])
        return Response(self.get_serializer(fork).data, status=status.HTTP_201_CREATED)


# ⚠️ **ضربانِ نگه‌دارندهٔ اتصال.**
#
# بینِ `event: start` و اولین حرفِ جواب، مدل پرامپت را پردازش می‌کند و این روی
# CPU **بیش از یک دقیقه** طول می‌کشد — در گفتگویی که تاریخچه دارد، بیشتر. در آن
# فاصله هیچ بایتی روی جریان نمی‌رود و پراکسیِ Vite اتصالِ بی‌جنب‌وجوش را می‌بندد؛
# مرورگر آن را یک درخواستِ شکست‌خورده می‌بیند، نه یک استریمِ در حالِ کار.
#
# با curl دیده نمی‌شد چون آنجا نه پراکسی هست نه مهلتِ بی‌کاری — برای همین پیامِ
# دوم در ترمینال کار می‌کرد و در مرورگر نه.
#
# خطِ کامنتِ SSE (شروع با «:») را کلاینت نادیده می‌گیرد، پس فقط اتصال را زنده
# نگه می‌دارد بی‌آنکه چیزی به گفتگو اضافه کند.
HEARTBEAT_SECONDS = 10
HEARTBEAT = ": ping" + chr(10) + chr(10)


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
        _apply_model(conversation, request.data.get("model"), fields)
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

        # کارِ سنگین در تردِ جدا می‌رود تا این جریان بتواند در فاصله‌های سکوت
        # ضربان بفرستد. بدونِ آن، `answer_stream` جریان را بلاک می‌کند و هیچ
        # بایتی بیرون نمی‌رود.
        events = queue.Queue()

        def produce():
            try:
                for item in answer_stream(user, conversation):
                    events.put(("event", item))
            except (EngineNotConfigured, EngineError) as exc:
                events.put(("error", str(exc)))
            except Exception as exc:  # noqa: BLE001
                logger.exception("chat stream crashed")
                events.put(("error", f"خطای غیرمنتظره: {exc}"))
            finally:
                # ⚠️ اتصالِ دیتابیسِ این ترد باید بسته شود، وگرنه با هر پیام یک
                # اتصالِ بی‌صاحب در استخر جا می‌ماند
                connections.close_all()
                events.put(("end", None))

        threading.Thread(target=produce, daemon=True).start()

        while True:
            try:
                kind, payload = events.get(timeout=HEARTBEAT_SECONDS)
            except queue.Empty:
                yield HEARTBEAT
                continue

            if kind == "end":
                return
            if kind == "error":
                yield _sse("error", {"error": payload})
                continue

            name, data = payload
            if name == "delta":
                yield _sse("delta", {"text": data})
            elif name == "tool":
                yield _sse("tool", {"name": data})
            elif name == "reset":
                # متنِ خامِ یک فراخوانیِ ابزار روی صفحه رفته بود؛ فرانت
                # باید آنچه تا حالا نوشته را دور بریزد
                yield _sse("reset", {})
            elif name == "done":
                text, used, context = data
                assistant = conversation.messages.create(
                    role="assistant", body=text, tools_used=used,
                    suggestion=build_suggestions(used, context),
                )
                yield _sse("done", {"assistantMessage": MessageSerializer(assistant).data})
