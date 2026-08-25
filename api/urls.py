from django.urls import path
from account import views as account_views
from home import views as home_views
from . import views

app_name = "api"

# احراز هویت
auth_patterns = [
    path("auth/csrf/", account_views.CSRFView.as_view(), name="csrf"),
    path("auth/me/", account_views.MeView.as_view(), name="me"),
    path("auth/register/", account_views.RegisterView.as_view(), name="register"),
    path("auth/login/", account_views.LoginView.as_view(), name="login"),
    path("auth/logout/", account_views.LogoutView.as_view(), name="logout"),
    path("auth/otp/phone/", account_views.OtpPhoneView.as_view(), name="otp_phone"),
    path("auth/otp/confirm/", account_views.OtpConfirmView.as_view(), name="otp_confirm"),
    path("auth/forget-password/", account_views.ForgetPasswordView.as_view(), name="forget_password"),
    path("auth/change-password/", account_views.ChangePasswordView.as_view(), name="change_password"),
]

# مشتریان و تراکنش‌ها — همه اسکوپ‌شده به مالکِ درخواست
ledger_patterns = [
    path("dashboard/", home_views.DashboardView.as_view(), name="dashboard"),
    path("customers/", home_views.CustomerListCreateView.as_view(), name="customers"),
    path("customers/<int:pk>/", home_views.CustomerDetailView.as_view(), name="customer_detail"),
    path("customers/<int:customer_id>/transactions/",
         home_views.TransactionListCreateView.as_view(), name="transactions"),
    path("customers/<int:customer_id>/transactions/search/",
         home_views.TransactionSearchView.as_view(), name="transaction_search"),
    path("customers/<int:customer_id>/transactions/<int:pk>/",
         home_views.TransactionDetailView.as_view(), name="transaction_detail"),
    # همهٔ تراکنش‌های مالک، بدونِ قیدِ مشتری — صفحه‌بندی‌شده برای اسکرولِ بی‌نهایت
    path("transactions/", home_views.AllTransactionsView.as_view(), name="all_transactions"),
    path("transactions/search/", home_views.AllTransactionsSearchView.as_view(), name="all_transactions_search"),
]

# عمومی
misc_patterns = [
    path("health/", views.HealthView.as_view(), name="health"),
]

urlpatterns = auth_patterns + ledger_patterns + misc_patterns
