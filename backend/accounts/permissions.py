"""Role-based permissions, enforced server-side."""
from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsTutorOrAdmin(BasePermission):
    message = "Only tutors and administrators can do this."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_tutor or u.is_platform_admin))


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_platform_admin)


class IsOwnerTutorOrAdminOrReadOnly(BasePermission):
    """Read for any authenticated user; writes only by the course author or an admin."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        owner = getattr(obj, "instructor", None) or getattr(getattr(obj, "course", None), "instructor", None)
        return request.user.is_platform_admin or owner == request.user
