from rest_framework import serializers

from .models import AIConversation, AIMessage


class AIMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIMessage
        fields = ["id", "role", "content", "follow_ups", "created_at"]


class AIConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIConversation
        fields = ["id", "title", "subject", "socratic_mode", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class AIConversationDetailSerializer(AIConversationSerializer):
    messages = AIMessageSerializer(many=True, read_only=True)

    class Meta(AIConversationSerializer.Meta):
        fields = AIConversationSerializer.Meta.fields + ["messages"]


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=4000, trim_whitespace=True)
