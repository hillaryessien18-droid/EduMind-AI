import json

from django.http import StreamingHttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .models import AIConversation, AIMessage
from .serializers import AIConversationDetailSerializer, AIConversationSerializer, SendMessageSerializer
from .services.ai_client import AIUnavailable, StreamResult, get_client, log_usage, stream_chat
from .services.tutor import build_messages, make_title, split_follow_ups


def sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


class ConversationViewSet(viewsets.ModelViewSet):
    """A user's AI tutor conversations. Other users' conversations return 404."""

    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        return AIConversation.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return AIConversationDetailSerializer if self.action == "retrieve" else AIConversationSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_throttles(self):
        if self.action == "messages":
            self.throttle_scope = "ai"
            return [ScopedRateThrottle()]
        return super().get_throttles()

    @action(detail=True, methods=["post"])
    def messages(self, request, pk=None):
        """Send a message; the reply streams back as Server-Sent Events.

        Events: `delta` {text}, `done` {message}, `error` {detail}.
        """
        conversation = self.get_object()
        payload = SendMessageSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        try:
            get_client()  # fail fast with a clear 503 if not configured
        except AIUnavailable as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        content = payload.validated_data["content"]
        AIMessage.objects.create(conversation=conversation, role=AIMessage.Role.USER, content=content)
        if conversation.title == "New conversation":
            conversation.title = make_title(content)
        conversation.save()  # bumps updated_at

        history = list(conversation.messages.all())
        messages = build_messages(conversation, history)
        user = request.user

        def event_stream():
            result = StreamResult()
            try:
                for delta in stream_chat(messages, result):
                    yield sse("delta", {"text": delta})
            except AIUnavailable as exc:
                log_usage(user, "tutor", result.prompt_tokens, result.completion_tokens, False, str(exc))
                yield sse("error", {"detail": str(exc)})
                return
            body, follow_ups = split_follow_ups(result.text)
            msg = AIMessage.objects.create(
                conversation=conversation, role=AIMessage.Role.ASSISTANT, content=body, follow_ups=follow_ups
            )
            log_usage(user, "tutor", result.prompt_tokens, result.completion_tokens)
            yield sse("done", {
                "message": {"id": msg.id, "role": msg.role, "content": body,
                            "follow_ups": follow_ups, "created_at": msg.created_at.isoformat()},
                "title": conversation.title,
            })

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
