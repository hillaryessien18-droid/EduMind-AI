"""Create demo tutors, categories and published courses so the course manager isn't empty.

Usage: python manage.py seed_demo
Demo accounts use the password given by --password (default: EduMind-demo-2026).
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import StudentProfile, TutorProfile, User
from courses.models import Category, Course, Lesson, Module

CATEGORIES = [
    ("Design", "orange"), ("Development", "purple"), ("Machine Learning", "green"),
    ("Architecture", "amber"), ("Management", "teal"), ("Marketing", "blue"), ("Cybersecurity", "emerald"),
]

COURSES = [
    ("Introduction to UI/UX Design", "Design", ("Tony", "Stark"), "50", "100"),
    ("Full Stack JavaScript Development", "Development", ("David", "Smith"), "25", "100"),
    ("Data Science & Machine Learning", "Machine Learning", ("Arthur", "Taylor"), "90", "100"),
    ("Cloud Architecture Fundamentals", "Architecture", ("Harry", "Porter"), "75", "150"),
    ("Product Management Masterclass", "Management", ("John", "Wick"), "80", "100"),
    ("Basics of Digital Marketing Strategy", "Marketing", ("Wei", "Chang"), "40", "100"),
    ("Advanced Cybersecurity Essentials", "Cybersecurity", ("Frank", "Gary"), "75", "150"),
]


class Command(BaseCommand):
    help = "Seed demo categories, tutors and courses."

    def add_arguments(self, parser):
        parser.add_argument("--password", default="EduMind-demo-2026")

    @transaction.atomic
    def handle(self, *args, password, **options):
        cats = {}
        for name, color in CATEGORIES:
            cats[name], _ = Category.objects.get_or_create(name=name, defaults={"color": color})

        for title, cat, (first, last), price, original in COURSES:
            email = f"{first.lower()}.{last.lower()}@demo.edumind.ai"
            tutor, created = User.objects.get_or_create(
                email=email, defaults={"first_name": first, "last_name": last, "role": User.Role.TUTOR}
            )
            if created:
                tutor.set_password(password)
                tutor.save()
                TutorProfile.objects.create(user=tutor, expertise=cat)
            course, created = Course.objects.get_or_create(
                title=title,
                defaults={
                    "category": cats[cat], "instructor": tutor, "status": Course.Status.PUBLISHED,
                    "price": Decimal(price), "original_price": Decimal(original),
                    "description": f"A practical, project-based course on {title.lower()}.",
                },
            )
            if created:
                for m in range(1, 3):
                    module = Module.objects.create(course=course, title=f"Module {m}", order=m)
                    for l in range(1, 4):
                        Lesson.objects.create(
                            module=module, order=l, title=f"Lesson {m}.{l}",
                            content=f"# Lesson {m}.{l}\n\nContent for {title}.",
                        )

        student, created = User.objects.get_or_create(
            email="student@demo.edumind.ai", defaults={"first_name": "Demo", "last_name": "Student"}
        )
        if created:
            student.set_password(password)
            student.save()
            StudentProfile.objects.create(user=student)
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(COURSES)} courses. Demo password: {password}"))
