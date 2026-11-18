from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import StudentProfile, TutorProfile, User


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = ["interests", "goals", "preferred_pace", "daily_goal_minutes", "onboarded"]


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    student_profile = StudentProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "display_name",
            "role", "avatar", "email_verified", "student_profile", "date_joined",
        ]
        read_only_fields = ["id", "email", "role", "email_verified", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    # Public sign-up can choose student or tutor; admins are created via createsuperuser.
    role = serializers.ChoiceField(
        choices=[User.Role.STUDENT, User.Role.TUTOR], default=User.Role.STUDENT
    )

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name", "role"]

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        validate_password(attrs["password"], User(email=attrs["email"]))
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        if user.role == User.Role.TUTOR:
            TutorProfile.objects.create(user=user)
        else:
            StudentProfile.objects.create(user=user)
        return user
