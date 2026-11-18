from django.contrib import admin

from .models import AIConversation, AIUsageLog


@admin.register(AIUsageLog)
class AIUsageLogAdmin(admin.ModelAdmin):
    list_display = ["created_at", "user", "feature", "model", "prompt_tokens", "completion_tokens", "estimated_cost_usd", "success"]
    list_filter = ["feature", "success", "model"]


@admin.register(AIConversation)
class AIConversationAdmin(admin.ModelAdmin):
    # Message content is private educational data; it is intentionally not shown here.
    list_display = ["title", "user", "socratic_mode", "updated_at"]

