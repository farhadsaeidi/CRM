from django.urls import path
from account import views as account_views
from . import views

app_name = "api"

# احراز هویت
auth_patterns = [
    path("auth/csrf/", account_views.CSRFView.as_view(), name="csrf"),
    path("auth/me/", account_views.MeView.as_view(), name="me"),
    path("auth/register/", account_views.RegisterView.as_view(), name="register"),
    path("auth/login/", account_views.LoginView.as_view(), name="login"),
    path("auth/logout/", account_views.LogoutView.as_view(), name="logout"),
]

# عمومی
misc_patterns = [
    path("health/", views.HealthView.as_view(), name="health"),
]

urlpatterns = auth_patterns + misc_patterns
