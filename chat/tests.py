"""گفتگوهای دستیار — ماندگاری و اسکوپینگ.

قراردادی که این فایل قفل می‌کند: گفتگو خصوصی‌ترین محتوای مالک است. شناسهٔ مالکِ
دیگر ۴۰۴ می‌گیرد نه ۴۰۳ — همان قاعدهٔ `home/tests/test_scoping.py`.
"""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from chat.models import Conversation
from home.tests.factories import make_owner


class ConversationCrudTests(APITestCase):
    def setUp(self):
        self.owner = make_owner()
        self.client.force_login(self.owner)

    def test_creating_a_conversation(self):
        response = self.client.post(reverse("api:conversations"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Conversation.objects.get().owner, self.owner)

    def test_owner_comes_from_the_session_not_the_body(self):
        """قرارداد: کلاینت نمی‌تواند گفتگویی به نامِ مالکِ دیگری بسازد."""
        stranger = make_owner()
        response = self.client.post(reverse("api:conversations"),
                                    {"owner": stranger.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Conversation.objects.get().owner, self.owner)

    def test_list_shows_only_my_conversations(self):
        Conversation.objects.create(owner=self.owner, title="مالِ من")
        Conversation.objects.create(owner=make_owner(), title="مالِ غریبه")

        body = self.client.get(reverse("api:conversations")).json()
        titles = [row["title"] for row in body["results"] if "results" in body] or \
                 [row["title"] for row in body]
        self.assertEqual(titles, ["مالِ من"])

    def test_deleting(self):
        conversation = Conversation.objects.create(owner=self.owner)
        url = reverse("api:conversation_detail", args=[conversation.id])
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_200_OK)
        self.assertFalse(Conversation.objects.exists())


class MessageTests(APITestCase):
    def setUp(self):
        self.owner = make_owner()
        self.client.force_login(self.owner)
        self.conversation = Conversation.objects.create(owner=self.owner)
        self.url = reverse("api:conversation_messages", args=[self.conversation.id])

    def test_sending_stores_the_user_message(self):
        response = self.client.post(self.url, {"body": "بدهکارانم چند نفرند؟"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["userMessage"]["body"], "بدهکارانم چند نفرند؟")
        self.assertEqual(self.conversation.messages.count(), 1)

    def test_no_fabricated_answer_before_the_engine_exists(self):
        """قرارداد: تا وقتی موتور وصل نشده، پاسخِ ساختگی تولید نمی‌شود.

        یک جملهٔ عمومیِ خوش‌ظاهر بدتر از نبودنِ جواب است — کاربر فکر می‌کند
        دستیار کار می‌کند و به حرفش اعتماد می‌کند.
        """
        response = self.client.post(self.url, {"body": "سلام"}, format="json")
        self.assertIsNone(response.json()["assistantMessage"])

    def test_first_message_becomes_the_title(self):
        self.client.post(self.url, {"body": "وضعیت حسابِ رضا"}, format="json")
        self.conversation.refresh_from_db()
        self.assertEqual(self.conversation.title, "وضعیت حسابِ رضا")

    def test_second_message_does_not_rename(self):
        self.client.post(self.url, {"body": "اولی"}, format="json")
        self.client.post(self.url, {"body": "دومی"}, format="json")
        self.conversation.refresh_from_db()
        self.assertEqual(self.conversation.title, "اولی")

    def test_empty_body_is_rejected(self):
        response = self.client.post(self.url, {"body": "   "}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(self.conversation.messages.exists())

    def test_sending_bumps_last_activity(self):
        before = self.conversation.updated
        self.client.post(self.url, {"body": "سلام"}, format="json")
        self.conversation.refresh_from_db()
        self.assertGreater(self.conversation.updated, before)


class ScopingTests(APITestCase):
    """گفتگوی مالکِ دیگر: ۴۰۴ روی هر سه endpoint، و مهمان هیچ‌جا."""

    def setUp(self):
        self.owner = make_owner()
        self.stranger = make_owner()
        self.theirs = Conversation.objects.create(owner=self.stranger, title="خصوصی")
        self.client.force_login(self.owner)

    def urls(self):
        return [
            ("get", reverse("api:conversation_detail", args=[self.theirs.id])),
            ("patch", reverse("api:conversation_detail", args=[self.theirs.id])),
            ("delete", reverse("api:conversation_detail", args=[self.theirs.id])),
            ("post", reverse("api:conversation_messages", args=[self.theirs.id])),
        ]

    def test_other_owner_gets_404_not_403(self):
        for method, url in self.urls():
            with self.subTest(url=url, method=method):
                response = getattr(self.client, method)(url, {"body": "x"}, format="json")
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_messages_of_another_owner_never_leak(self):
        self.theirs.messages.create(role="user", body="رازِ من")
        response = self.client.get(reverse("api:conversation_detail", args=[self.theirs.id]))
        self.assertNotIn("رازِ من", response.content.decode())

    def test_guest_gets_nothing(self):
        self.client.logout()
        for url in [reverse("api:conversations")] + [u for _, u in self.urls()]:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)
