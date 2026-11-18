from django.contrib import admin

from .models import Answer, Question, Quiz, QuizAttempt


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 2


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    inlines = [AnswerInline]
    list_display = ["prompt", "quiz", "type", "points"]


admin.site.register([Quiz, QuizAttempt])
