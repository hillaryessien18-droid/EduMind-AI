from rest_framework import serializers

from .models import Answer, Question, Quiz, QuizAttempt


class AnswerPublicSerializer(serializers.ModelSerializer):
    """Never exposes is_correct to quiz takers."""

    class Meta:
        model = Answer
        fields = ["id", "text"]


class AnswerWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ["id", "text", "is_correct"]


class QuestionPublicSerializer(serializers.ModelSerializer):
    answers = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ["id", "type", "prompt", "points", "order", "answers"]

    def get_answers(self, obj):
        if obj.type == Question.Type.SHORT_ANSWER:
            return []
        return AnswerPublicSerializer(obj.answers.all(), many=True).data


class QuestionWriteSerializer(serializers.ModelSerializer):
    answers = AnswerWriteSerializer(many=True)

    class Meta:
        model = Question
        fields = ["id", "type", "prompt", "explanation", "points", "order", "answers"]

    def validate(self, attrs):
        answers = attrs.get("answers", [])
        if not any(a.get("is_correct") for a in answers):
            raise serializers.ValidationError("Each question needs at least one correct answer.")
        if attrs.get("type") == Question.Type.MULTIPLE_CHOICE and len(answers) < 2:
            raise serializers.ValidationError("Multiple-choice questions need at least two options.")
        return attrs


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionPublicSerializer(many=True, read_only=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ["id", "course", "lesson", "title", "time_limit_minutes", "question_count", "questions", "created_at"]
        read_only_fields = ["created_at"]

    def get_question_count(self, obj):
        return obj.questions.count()


class QuizWriteSerializer(serializers.ModelSerializer):
    questions = QuestionWriteSerializer(many=True)

    class Meta:
        model = Quiz
        fields = ["id", "course", "lesson", "title", "time_limit_minutes", "questions"]

    def create(self, validated_data):
        questions = validated_data.pop("questions")
        quiz = Quiz.objects.create(**validated_data)
        for i, q in enumerate(questions):
            answers = q.pop("answers")
            q.setdefault("order", i)
            question = Question.objects.create(quiz=quiz, **q)
            Answer.objects.bulk_create([Answer(question=question, **a) for a in answers])
        return quiz


class QuizAttemptSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)
    percent = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = ["id", "quiz", "quiz_title", "started_at", "submitted_at", "score", "max_score", "percent", "results"]

    def get_percent(self, obj):
        return round(obj.score / obj.max_score * 100) if obj.max_score else 0
