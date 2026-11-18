from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import User
from courses.models import Course, Enrollment

from .models import Answer, Question, Quiz


class QuizScoringTests(APITestCase):
    def setUp(self):
        self.tutor = User.objects.create_user(email="t@example.com", password="x", role="tutor")
        self.student = User.objects.create_user(email="s@example.com", password="x")
        self.course = Course.objects.create(title="C", instructor=self.tutor, status="published")
        self.quiz = Quiz.objects.create(course=self.course, title="Q", created_by=self.tutor)
        self.mcq = Question.objects.create(quiz=self.quiz, type="mcq", prompt="2+2?", points=2)
        self.right = Answer.objects.create(question=self.mcq, text="4", is_correct=True)
        self.wrong = Answer.objects.create(question=self.mcq, text="5")
        self.short = Question.objects.create(quiz=self.quiz, type="short", prompt="Capital of Nigeria?")
        Answer.objects.create(question=self.short, text="Abuja", is_correct=True)

    def test_questions_do_not_leak_correct_answers(self):
        self.client.force_authenticate(self.student)
        res = self.client.get(reverse("quiz-detail", args=[self.quiz.id]))
        self.assertNotIn("is_correct", str(res.data))
        self.assertEqual(res.data["questions"][1]["answers"], [])

    def test_must_be_enrolled_to_submit(self):
        self.client.force_authenticate(self.student)
        res = self.client.post(reverse("quiz-submit", args=[self.quiz.id]), {"responses": {}}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_deterministic_scoring(self):
        Enrollment.objects.create(student=self.student, course=self.course)
        self.client.force_authenticate(self.student)
        res = self.client.post(
            reverse("quiz-submit", args=[self.quiz.id]),
            {"responses": {str(self.mcq.id): self.right.id, str(self.short.id): "  abuja "}},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual((res.data["score"], res.data["max_score"], res.data["percent"]), (3, 3, 100))

        res = self.client.post(
            reverse("quiz-submit", args=[self.quiz.id]),
            {"responses": {str(self.mcq.id): self.wrong.id, str(self.short.id): "Lagos"}},
            format="json",
        )
        self.assertEqual(res.data["score"], 0)

    def test_attempts_are_private(self):
        other = User.objects.create_user(email="o@example.com", password="x")
        Enrollment.objects.create(student=self.student, course=self.course)
        self.client.force_authenticate(self.student)
        self.client.post(reverse("quiz-submit", args=[self.quiz.id]), {"responses": {}}, format="json")
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get(reverse("quiz-attempt-list")).data["count"], 0)
