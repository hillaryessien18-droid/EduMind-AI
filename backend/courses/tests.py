from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import User

from .models import Category, Course, Enrollment, Lesson, Module


class CourseTests(APITestCase):
    def setUp(self):
        self.tutor = User.objects.create_user(email="t@example.com", password="x", role="tutor")
        self.other_tutor = User.objects.create_user(email="t2@example.com", password="x", role="tutor")
        self.student = User.objects.create_user(email="s@example.com", password="x")
        self.cat = Category.objects.create(name="Design")
        self.published = Course.objects.create(
            title="Pub", instructor=self.tutor, status="published", category=self.cat, price=50, original_price=100
        )
        self.draft = Course.objects.create(title="Draft", instructor=self.tutor)
        module = Module.objects.create(course=self.published, title="M1")
        self.lesson = Lesson.objects.create(module=module, title="L1")

    def test_student_sees_only_published(self):
        self.client.force_authenticate(self.student)
        res = self.client.get(reverse("course-list"))
        titles = [c["title"] for c in res.data["results"]]
        self.assertEqual(titles, ["Pub"])
        self.assertEqual(res.data["results"][0]["discount_percent"], 50)

    def test_student_cannot_create_course(self):
        self.client.force_authenticate(self.student)
        res = self.client.post(reverse("course-list"), {"title": "Nope"})
        self.assertEqual(res.status_code, 403)

    def test_tutor_creates_course_as_instructor(self):
        self.client.force_authenticate(self.tutor)
        res = self.client.post(reverse("course-list"), {"title": "New", "price": "10.00"})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Course.objects.get(title="New").instructor, self.tutor)

    def test_tutor_cannot_edit_someone_elses_course(self):
        self.client.force_authenticate(self.other_tutor)
        res = self.client.patch(reverse("course-detail", args=[self.published.id]), {"title": "Hacked"})
        self.assertEqual(res.status_code, 403)

    def test_search_and_category_filter(self):
        self.client.force_authenticate(self.tutor)
        res = self.client.get(reverse("course-list"), {"search": "draft"})
        self.assertEqual([c["title"] for c in res.data["results"]], ["Draft"])
        res = self.client.get(reverse("course-list"), {"category": "design"})
        self.assertEqual([c["title"] for c in res.data["results"]], ["Pub"])

    def test_enroll_and_complete_lesson_updates_dashboard(self):
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.post(reverse("course-enroll", args=[self.published.id])).status_code, 201)
        self.client.post(reverse("lesson-complete", args=[self.lesson.id]), {"time_spent_seconds": 600})
        dash = self.client.get(reverse("dashboard")).data
        self.assertEqual(dash["stats"]["enrolled_courses"], 1)
        self.assertEqual(dash["stats"]["completed_lessons"], 1)
        self.assertEqual(dash["stats"]["learning_minutes"], 10)
        self.assertEqual(dash["stats"]["streak_days"], 1)
        self.assertEqual(dash["courses"][0]["percent"], 100)

    def test_cannot_complete_lesson_without_enrollment(self):
        self.client.force_authenticate(self.student)
        res = self.client.post(reverse("lesson-complete", args=[self.lesson.id]))
        self.assertEqual(res.status_code, 403)
        self.assertFalse(Enrollment.objects.exists())
