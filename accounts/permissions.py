from rest_framework.permissions import BasePermission

class IsSuperuser(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, "role") and request.user.role == "superuser"

class IsManagerOrAbove(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, "role") and request.user.role in ("superuser", "manager")

class IsAnyRole(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, "role") and request.user.role in ("superuser", "manager", "employee")

class IsOwnerOrManagerAbove(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, "role") and request.user.role in ("superuser", "manager", "employee")

    def has_object_permission(self, request, view, obj):
        if request.user.role in ("superuser", "manager"):
            return True
        return True
