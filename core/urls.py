from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.views.generic.base import RedirectView
from django.conf.urls.static import static

urlpatterns = [
    # پنل ادمین جنگو روی مسیرِ جدا تا با روتِ SPA فرانت («/admin») تداخل نکند
    path("django-admin/", admin.site.urls),
    path("favicon.ico", RedirectView.as_view(url=settings.STATIC_URL + "icons/logo.png")),
    path("api/", include("api.urls", namespace="api")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
