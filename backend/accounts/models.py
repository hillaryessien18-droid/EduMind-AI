from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Email is the login identifier."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.update(is_staff=True, is_superuser=True, role=User.Role.ADMIN)
        return self._create_user(email, password, **extra)


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        TUTOR = "tutor", "Tutor"
        ADMIN = "admin", "Administrator"

    username = None
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT, db_index=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    email_verified = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    @property
    def display_name(self) -> str:
        full = f"{self.first_name} {self.last_name}".strip()
        return full or self.email.split("@")[0]

    @property
    def is_tutor(self) -> bool:
        return self.role == self.Role.TUTOR

    @property
    def is_platform_admin(self) -> bool:
        return self.role == self.Role.ADMIN or self.is_superuser

    def __str__(self):
        return self.email


class StudentProfile(models.Model):
    class Pace(models.TextChoices):
        RELAXED = "relaxed", "Relaxed"
        STEADY = "steady", "Steady"
        INTENSIVE = "intensive", "Intensive"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    interests = models.JSONField(default=list, blank=True)
    goals = models.TextField(blank=True)
    preferred_pace = models.CharField(max_length=10, choices=Pace.choices, default=Pace.STEADY)
    daily_goal_minutes = models.PositiveSmallIntegerField(default=30)
    onboarded = models.BooleanField(default=False)

    def __str__(self):
        return f"StudentProfile<{self.user_id}>"


class TutorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="tutor_profile")
    bio = models.TextField(blank=True)
    expertise = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f"TutorProfile<{self.user_id}>"
