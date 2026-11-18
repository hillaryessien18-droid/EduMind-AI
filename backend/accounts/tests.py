from django.urls import reverse
from rest_framework.test import APITestCase

from .models import User


class AuthTests(APITestCase):
    def test_register_returns_tokens_and_creates_student_profile(self):
        res = self.client.post(reverse("register"), {
            "email": "Ada@Example.com", "password": "Str0ng-pass!", "first_name": "Ada",
        })
        self.assertEqual(res.status_code, 201)
        self.assertIn("access", res.data["tokens"])
        user = User.objects.get(email="ada@example.com")
        self.assertEqual(user.role, "student")
        self.assertTrue(hasattr(user, "student_profile"))

    def test_cannot_self_register_as_admin(self):
        res = self.client.post(reverse("register"), {
            "email": "x@example.com", "password": "Str0ng-pass!", "role": "admin",
        })
        self.assertEqual(res.status_code, 400)

    def test_login_and_me(self):
        User.objects.create_user(email="s@example.com", password="Str0ng-pass!")
        res = self.client.post(reverse("login"), {"email": "s@example.com", "password": "Str0ng-pass!"})
        self.assertEqual(res.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        me = self.client.get(reverse("me"))
        self.assertEqual(me.data["email"], "s@example.com")

    def test_me_requires_auth(self):
        self.assertEqual(self.client.get(reverse("me")).status_code, 401)
