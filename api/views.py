from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


# noinspection PyMethodMayBeStatic
class HealthView(APIView):
    """تنها endpointِ اسکلت: نشان می‌دهد زنجیرهٔ فرانت → پراکسی Vite → جنگو → DRF برقرار است.

    وقتی اپ‌های واقعی اضافه شدند این می‌تواند بماند (برای مانیتورینگ) یا حذف شود.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "CRM"})
