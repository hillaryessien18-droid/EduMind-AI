from rest_framework import serializers

from .models import Category, Course, Enrollment, Lesson, LessonProgress, Module


class CategorySerializer(serializers.ModelSerializer):
    course_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "color", "course_count"]
        read_only_fields = ["slug"]


class InstructorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    display_name = serializers.CharField()


class LessonSerializer(serializers.ModelSerializer):
    completed = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = ["id", "module", "title", "content", "estimated_minutes", "order", "completed"]

    def get_completed(self, obj):
        user = self.context.get("request").user if self.context.get("request") else None
        if not user or not user.is_authenticated:
            return False
        return LessonProgress.objects.filter(student=user, lesson=obj, completed=True).exists()


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ["id", "course", "title", "order", "lessons"]


class CourseListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source="category", queryset=Category.objects.all(), write_only=True, required=False, allow_null=True
    )
    instructor = InstructorSerializer(read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    lesson_count = serializers.IntegerField(read_only=True)
    student_count = serializers.IntegerField(read_only=True)
    is_enrolled = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id", "title", "slug", "description", "category", "category_id", "instructor",
            "thumbnail", "level", "status", "price", "original_price", "discount_percent",
            "lesson_count", "student_count", "is_enrolled", "created_at",
        ]
        read_only_fields = ["slug", "created_at"]

    def get_is_enrolled(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.enrollments.filter(student=request.user).exists()

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", 0))
        original = attrs.get("original_price", getattr(self.instance, "original_price", None))
        if original is not None and original < price:
            raise serializers.ValidationError({"original_price": "Original price must be at least the current price."})
        return attrs


class CourseDetailSerializer(CourseListSerializer):
    modules = ModuleSerializer(many=True, read_only=True)

    class Meta(CourseListSerializer.Meta):
        fields = CourseListSerializer.Meta.fields + ["modules"]


class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = ["id", "course", "enrolled_at"]
