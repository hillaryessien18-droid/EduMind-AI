from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsOwnerTutorOrAdminOrReadOnly, IsTutorOrAdmin

from .models import Category, Course, Enrollment, Lesson, LessonProgress, Module
from .serializers import (
    CategorySerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    InstructorSerializer,
    LessonSerializer,
    ModuleSerializer,
)


def visible_courses(user):
    """Students see published courses; tutors also see their own drafts; admins see everything."""
    qs = Course.objects.select_related("category", "instructor")
    if user.is_platform_admin:
        return qs
    if user.is_tutor:
        return qs.filter(Q(status=Course.Status.PUBLISHED) | Q(instructor=user))
    return qs.filter(status=Course.Status.PUBLISHED)


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.annotate(course_count=Count("courses"))

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return super().get_permissions()
        return [IsTutorOrAdmin()]


class CourseViewSet(viewsets.ModelViewSet):
    """Course catalog / course manager.

    Query params: search, category (slug), author (user id), status (published|draft), mine=1
    """

    permission_classes = [IsOwnerTutorOrAdminOrReadOnly]

    def get_permissions(self):
        perms = [p() for p in self.permission_classes]
        if self.action in ("create", "update", "partial_update", "destroy", "publish"):
            perms.append(IsTutorOrAdmin())
        return [IsAuthenticated(), *perms]

    def get_serializer_class(self):
        return CourseDetailSerializer if self.action == "retrieve" else CourseListSerializer

    def get_queryset(self):
        qs = visible_courses(self.request.user).annotate(
            lesson_count=Count("modules__lessons", distinct=True),
            student_count=Count("enrollments", distinct=True),
        )
        p = self.request.query_params
        if search := p.get("search", "").strip():
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
        if category := p.get("category"):
            qs = qs.filter(category__slug=category)
        if author := p.get("author"):
            if author.isdigit():
                qs = qs.filter(instructor_id=int(author))
        if status_ := p.get("status"):
            qs = qs.filter(status=status_)
        if p.get("mine") == "1":
            qs = qs.filter(instructor=self.request.user)
        if p.get("enrolled") == "1":
            qs = qs.filter(enrollments__student=self.request.user)
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        course = self.get_object()
        course.status = (
            Course.Status.DRAFT if course.status == Course.Status.PUBLISHED else Course.Status.PUBLISHED
        )
        course.save(update_fields=["status", "updated_at"])
        return Response({"status": course.status})

    @action(detail=True, methods=["post", "delete"])
    def enroll(self, request, pk=None):
        course = self.get_object()
        if request.method == "DELETE":
            Enrollment.objects.filter(student=request.user, course=course).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        if course.status != Course.Status.PUBLISHED:
            return Response({"detail": "Course is not published."}, status=status.HTTP_400_BAD_REQUEST)
        Enrollment.objects.get_or_create(student=request.user, course=course)
        return Response({"enrolled": True}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def authors(self, request):
        ids = visible_courses(request.user).values_list("instructor_id", flat=True).distinct()
        authors = User.objects.filter(id__in=ids).order_by("first_name")
        return Response(InstructorSerializer(authors, many=True).data)


class ModuleViewSet(viewsets.ModelViewSet):
    serializer_class = ModuleSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return super().get_permissions()
        return [IsTutorOrAdmin(), IsOwnerTutorOrAdminOrReadOnly()]

    def get_queryset(self):
        courses = visible_courses(self.request.user)
        qs = Module.objects.filter(course__in=courses).prefetch_related("lessons")
        if course := self.request.query_params.get("course"):
            qs = qs.filter(course_id=course)
        return qs

    def perform_create(self, serializer):
        course = serializer.validated_data["course"]
        if not (self.request.user.is_platform_admin or course.instructor == self.request.user):
            raise PermissionDenied("You can only add modules to your own courses.")
        serializer.save()


class LessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ("list", "retrieve", "complete"):
            return super().get_permissions()
        return [IsTutorOrAdmin(), IsOwnerTutorOrAdminOrReadOnly()]

    def get_queryset(self):
        courses = visible_courses(self.request.user)
        return Lesson.objects.filter(module__course__in=courses).select_related("module__course")

    def perform_create(self, serializer):
        course = serializer.validated_data["module"].course
        if not (self.request.user.is_platform_admin or course.instructor == self.request.user):
            raise PermissionDenied("You can only add lessons to your own courses.")
        serializer.save()

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        lesson = self.get_object()
        if not Enrollment.objects.filter(student=request.user, course=lesson.course).exists():
            return Response({"detail": "Enroll in the course first."}, status=status.HTTP_403_FORBIDDEN)
        seconds = max(0, min(int(request.data.get("time_spent_seconds", 0) or 0), 6 * 3600))
        progress, _ = LessonProgress.objects.get_or_create(student=request.user, lesson=lesson)
        progress.completed = True
        progress.completed_at = progress.completed_at or timezone.now()
        progress.time_spent_seconds += seconds
        progress.save()
        return Response({"completed": True})


class DashboardView(APIView):
    """All numbers come from the current user's real records."""

    def get(self, request):
        user = request.user
        from quizzes.models import QuizAttempt
        from tutor.models import AIConversation

        enrollments = Enrollment.objects.filter(student=user).select_related("course")
        progress = LessonProgress.objects.filter(student=user, completed=True)
        courses = []
        for e in enrollments:
            total = Lesson.objects.filter(module__course=e.course).count()
            done = progress.filter(lesson__module__course=e.course).count()
            courses.append({
                "id": e.course_id, "title": e.course.title,
                "completed_lessons": done, "total_lessons": total,
                "percent": round(done / total * 100) if total else 0,
            })

        # Streak: consecutive days (ending today or yesterday) with a completed lesson.
        days = set(progress.exclude(completed_at=None).values_list("completed_at__date", flat=True))
        streak, day = 0, timezone.localdate()
        if day not in days:
            day -= timedelta(days=1)
        while day in days:
            streak += 1
            day -= timedelta(days=1)

        week_ago = timezone.now() - timedelta(days=7)
        weekly = []
        for i in range(6, -1, -1):
            d = timezone.localdate() - timedelta(days=i)
            secs = progress.filter(completed_at__date=d).aggregate(s=Sum("time_spent_seconds"))["s"] or 0
            weekly.append({"date": d.isoformat(), "minutes": round(secs / 60)})

        attempts = QuizAttempt.objects.filter(student=user, submitted_at__isnull=False)
        avg = attempts.aggregate(s=Sum("score"), m=Sum("max_score"))
        quiz_avg = round(avg["s"] / avg["m"] * 100) if avg["m"] else None

        convos = AIConversation.objects.filter(user=user).order_by("-updated_at")[:5]
        return Response({
            "user": {"display_name": user.display_name, "role": user.role},
            "stats": {
                "enrolled_courses": enrollments.count(),
                "completed_lessons": progress.count(),
                "learning_minutes": round((progress.aggregate(s=Sum("time_spent_seconds"))["s"] or 0) / 60),
                "lessons_this_week": progress.filter(completed_at__gte=week_ago).count(),
                "streak_days": streak,
                "quiz_average": quiz_avg,
                "quizzes_taken": attempts.count(),
            },
            "courses": courses,
            "weekly_activity": weekly,
            "recent_conversations": [{"id": c.id, "title": c.title, "updated_at": c.updated_at} for c in convos],
        })
