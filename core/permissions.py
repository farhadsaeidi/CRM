from rest_framework.permissions import BasePermission
from account.models import Roles


def role_permission(*roles):
    """کارخانهٔ مجوزِ نقش‌محور — به‌جای نوشتن یک کلاس برای هر ترکیبِ نقش‌ها.

    مثل SAM، ولی اینجا فقط دو نقش داریم؛ الگو را نگه می‌داریم تا اگر نقشِ سومی
    اضافه شد، ویوها دست نخورند.
    """
    class _RolePermission(BasePermission):
        message = "شما به این بخش دسترسی ندارید."

        def has_permission(self, request, view):
            user = request.user
            return bool(user and user.is_authenticated and user.role in roles)

    return _RolePermission


IsOwner = role_permission(Roles.OWNER, Roles.SUPERUSER)
IsSuperuser = role_permission(Roles.SUPERUSER)
