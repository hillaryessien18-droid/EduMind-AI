from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.permissions import IsTutorOrAdmin
from courses.models import Enrollment
from courses.views import visible_courses

from .grading import grade_attempt
from .models import Quiz, QuizAttempt
from .serializers import QuizAttemptSerializer, QuizSerializer, QuizWriteSerializer


class QuizViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsTutorOrAdmin()]
        return super().get_permissions()

    def get_serializer_class(self):
        return QuizWriteSerializer if self.action in ("create", "update", "partial_update") else QuizSerializer

    def get_queryset(self):
        qs = Quiz.objects.filter(course__in=visible_courses(self.request.user)).prefetch_related("questions__answers")
        if course := self.request.query_params.get("course"):
            qs = qs.filter(course_id=course)
        if self.action in ("update", "partial_update", "destroy") and not self.request.user.is_platform_admin:
            qs = qs.filter(course__instructor=self.request.user)
        return qs

    def perform_create(self, serializer):
        course = serializer.validated_data["course"]
        user = self.request.user
        if not (user.is_platform_admin or course.instructor == user):
            raise PermissionDenied("You can only add quizzes to your own courses.")
        serializer.save(created_by=user)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        quiz = self.get_object()
        user = request.user
        if not (user.is_platform_admin or quiz.course.instructor == user
                or Enrollment.objects.filter(student=user, course=quiz.course).exists()):
            raise PermissionDenied("Enroll in the course to take this quiz.")
        responses = request.data.get("responses", {})
        if not isinstance(responses, dict):
            return Response({"detail": "responses must be an object."}, status=status.HTTP_400_BAD_REQUEST)
        score, max_score, results = grade_attempt(quiz, responses)
        attempt = QuizAttempt.objects.create(
            student=user, quiz=quiz, score=score, max_score=max_score,
            results=results, submitted_at=timezone.now(),
        )
        return Response(QuizAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


class QuizAttemptViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = QuizAttemptSerializer

    def get_queryset(self):
        # Students only ever see their own attempts.
        return QuizAttempt.objects.filter(student=self.request.user).select_related("quiz")
