from django.contrib import admin

from .models import Category, Course, Enrollment, Lesson, LessonProgress, Module


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ["title", "instructor", "category", "status", "price", "created_at"]
    list_filter = ["status", "category", "level"]
    search_fields = ["title", "description"]
    prepopulated_fields = {"slug": ["title"]}


admin.site.register([Category, Module, Lesson, Enrollment, LessonProgress])
