from types import SimpleNamespace
from unittest import mock

from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import User

from .models import AIConversation, AIMessage, AIUsageLog
from .services.tutor import FOLLOW_UP_MARKER, build_messages, split_follow_ups


def fake_chunks(text, prompt=12, completion=34):
    for piece in [text[: len(text) // 2], text[len(text) // 2 :]]:
        yield SimpleNamespace(usage=None, choices=[SimpleNamespace(delta=SimpleNamespace(content=piece))])
    yield SimpleNamespace(usage=SimpleNamespace(prompt_tokens=prompt, completion_tokens=completion), choices=[])


class TutorServiceTests(APITestCase):
    def test_split_follow_ups(self):
        body, fus = split_follow_ups(f"Answer here.\n{FOLLOW_UP_MARKER}\n1. What next?\n- Why?\nHow?\nExtra")
        self.assertEqual(body, "Answer here.")
        self.assertEqual(fus, ["What next?", "Why?", "How?"])

    def test_socratic_prompt_included(self):
        convo = AIConversation(socratic_mode=True, subject="Maths")
        msgs = build_messages(convo, [])
        self.assertIn("Socratic mode is ON", msgs[0]["content"])
        self.assertIn("Maths", msgs[0]["content"])


@override_settings(OPENAI_API_KEY="test-key")
class TutorApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="s@example.com", password="x")
        self.other = User.objects.create_user(email="o@example.com", password="x")
        self.client.force_authenticate(self.user)

    def _stream(self, convo_id, content="Explain recursion"):
        res = self.client.post(reverse("conversation-messages", args=[convo_id]), {"content": content})
        return res, b"".join(res.streaming_content).decode() if hasattr(res, "streaming_content") else ""

    @mock.patch("tutor.services.ai_client.get_client")
    def test_streams_reply_and_stores_messages(self, get_client):
        reply = f"Recursion is a function calling itself.\n{FOLLOW_UP_MARKER}\nA?\nB?\nC?"
        get_client.return_value.chat.completions.create.return_value = fake_chunks(reply)
        convo = AIConversation.objects.create(user=self.user)
        with mock.patch("tutor.views.get_client"):
            res, body = self._stream(convo.id)
        self.assertEqual(res.status_code, 200)
        self.assertIn("event: delta", body)
        self.assertIn("event: done", body)
        msgs = list(convo.messages.all())
        self.assertEqual([m.role for m in msgs], ["user", "assistant"])
        self.assertEqual(msgs[1].content, "Recursion is a function calling itself.")
        self.assertEqual(msgs[1].follow_ups, ["A?", "B?", "C?"])
        log = AIUsageLog.objects.get()
        self.assertEqual((log.prompt_tokens, log.completion_tokens, log.success), (12, 34, True))
        convo.refresh_from_db()
        self.assertEqual(convo.title, "Explain recursion")

    @mock.patch("tutor.services.ai_client.get_client")
    def test_provider_failure_emits_error_event(self, get_client):
        get_client.return_value.chat.completions.create.side_effect = TimeoutError()
        convo = AIConversation.objects.create(user=self.user)
        with mock.patch("tutor.views.get_client"):
            _, body = self._stream(convo.id)
        self.assertIn("event: error", body)
        self.assertFalse(AIUsageLog.objects.get().success)

    @override_settings(OPENAI_API_KEY="")
    def test_missing_key_returns_503_not_fake_reply(self):
        convo = AIConversation.objects.create(user=self.user)
        res = self.client.post(reverse("conversation-messages", args=[convo.id]), {"content": "hi"})
        self.assertEqual(res.status_code, 503)
        self.assertEqual(AIMessage.objects.count(), 0)

    def test_cannot_access_other_users_conversation(self):
        theirs = AIConversation.objects.create(user=self.other, title="Private")
        self.assertEqual(self.client.get(reverse("conversation-detail", args=[theirs.id])).status_code, 404)
        self.assertEqual(self.client.delete(reverse("conversation-detail", args=[theirs.id])).status_code, 404)
        self.assertEqual(self.client.get(reverse("conversation-list")).data["count"], 0)
