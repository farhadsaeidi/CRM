"""سنجاق کردنِ رابطِ یک جواب روی داشبورد.

قراردادهایی که این تست‌ها قفل می‌کنند — اگر شکستند، رفتار عوض شده نه تست:
- کد از **خودِ پیام** برداشته می‌شود، نه از بدنهٔ درخواست؛
- فقط جوابِ دستیارِ **همین مالک** سنجاق می‌شود (بقیه ۴۰۴)؛
- سنجاق بعد از حذفِ گفتگو **می‌ماند**، چون برنامه کپی شده نه ارجاع.
"""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from chat.models import Conversation, PinnedView
from chat.views import MAX_PINS
from home.tests.factories import make_owner

UI_BODY = 'این هم بدهکاران:\n```openui-lang\nroot = Stack([card])\ndebt = Query("debtors", {}, {rows: []})\n```'
CODE = 'root = Stack([card])\ndebt = Query("debtors", {}, {rows: []})'


class PinTests(APITestCase):
    url = reverse("api:chat_pins")

    def setUp(self):
        self.owner = make_owner()
        self.stranger = make_owner()
        self.conversation = Conversation.objects.create(owner=self.owner)
        self.question = self.conversation.messages.create(role="user", body="بدهکارانم را نشان بده")
        self.answer = self.conversation.messages.create(role="assistant", body=UI_BODY)
        self.client.force_authenticate(self.owner)

    def pin(self, message_id):
        return self.client.post(self.url, {"message_id": message_id}, format="json")

    def test_pins_the_code_of_the_answer_with_its_question_as_title(self):
        response = self.pin(self.answer.id)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["code"], CODE)
        self.assertEqual(response.json()["title"], "بدهکارانم را نشان بده")
        self.assertEqual(response.json()["message"], self.answer.id)

    def test_the_client_cannot_send_its_own_code(self):
        """⚠️ بدنه فقط شناسه می‌پذیرد؛ کدی که کلاینت بفرستد نادیده گرفته می‌شود."""
        self.client.post(self.url, {"message_id": self.answer.id, "code": "root = Evil()"}, format="json")
        self.assertEqual(PinnedView.objects.get().code, CODE)

    def test_pinning_twice_returns_the_same_pin(self):
        first = self.pin(self.answer.id).json()["id"]
        second = self.pin(self.answer.id)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.json()["id"], first)
        self.assertEqual(PinnedView.objects.count(), 1)

    def test_answer_without_ui_is_400(self):
        plain = self.conversation.messages.create(role="assistant", body="سلام، چطور کمکتان کنم؟")
        self.assertEqual(self.pin(plain.id).status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_message_is_not_pinnable(self):
        self.assertEqual(self.pin(self.question.id).status_code, status.HTTP_404_NOT_FOUND)

    def test_other_owners_answer_is_404(self):
        """۴۰۴ نه ۴۰۳ — ۴۰۳ خودش می‌گفت «این پیام هست ولی مالِ تو نیست»."""
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.pin(self.answer.id).status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(PinnedView.objects.exists())

    def test_bad_message_id_is_400_not_500(self):
        self.assertEqual(self.pin("abc").status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_shows_only_own_pins_newest_first(self):
        self.pin(self.answer.id)
        later = self.conversation.messages.create(role="assistant", body=UI_BODY)
        self.pin(later.id)
        PinnedView.objects.create(owner=self.stranger, title="غریبه", code=CODE)
        rows = self.client.get(self.url).json()
        self.assertEqual([row["message"] for row in rows], [later.id, self.answer.id])

    def test_cap(self):
        for _ in range(MAX_PINS):
            PinnedView.objects.create(owner=self.owner, title="x", code=CODE)
        self.assertEqual(self.pin(self.answer.id).status_code, status.HTTP_400_BAD_REQUEST)

    def test_unpin_own_and_404_for_others(self):
        pin_id = self.pin(self.answer.id).json()["id"]
        detail = reverse("api:chat_pin_detail", args=[pin_id])
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.delete(detail).status_code, status.HTTP_404_NOT_FOUND)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.delete(detail).status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PinnedView.objects.exists())

    def test_pin_survives_deleting_the_conversation(self):
        """⚠️ برنامه کپی شده: داشبورد با حذفِ گفتگو خالی نمی‌شود."""
        self.pin(self.answer.id)
        self.conversation.delete()
        rows = self.client.get(self.url).json()
        self.assertEqual(len(rows), 1)
        self.assertEqual((rows[0]["code"], rows[0]["message"]), (CODE, None))

    def test_guest_is_refused(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(self.url).status_code,
                      (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
