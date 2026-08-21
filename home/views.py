from django.db import transaction as db_transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import ParseError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsOwner

from .models import Customer, CustomerOwner, Transaction
from .serializers import CustomerSerializer, TransactionSerializer
from .services import (
    FILTER_CODES,
    build_date_search_query,
    build_period_query,
    calculate_remainder,
    recalculate_account,
)


class CustomerPagination(PageNumberPagination):
    """پنج مشتری در هر صفحه — نه پیش‌فرضِ ۱۰ تاییِ DRF.

    ارتفاعِ جدول به تعداد ردیف گره خورده و پنج ردیف اندازه‌ای است که کارت در
    ارتفاعِ صفحه جا شود بدون اینکه خودش اسکرول لازم داشته باشد.
    """
    page_size = 5


class OwnerScopedMixin:
    """اسکوپینگِ ضدِ IDOR.

    هر ویو queryset خودش را به مالکِ درخواست محدود می‌کند — نه فقط فیلترِ فرانت.
    بدون این، عوض کردنِ id در یوآرال دفترِ مالکِ دیگری را باز می‌کند.
    """
    permission_classes = [IsOwner]

    def owner_customers(self):
        return Customer.objects.filter(owners=self.request.user)

    def get_customer_or_404(self, customer_id):
        return get_object_or_404(self.owner_customers(), pk=customer_id)


# ----------------------------------------------------------------- مشتریان

class CustomerListCreateView(OwnerScopedMixin, generics.ListCreateAPIView):
    """فهرست مشتریانِ مالک (با صفحه‌بندی، جستجو و فیلترِ وضعیت) و ثبت مشتری تازه.

    پارامترها: `?query=` روی نام و شماره، `?filter=debt|credit|zero|all`
    """
    serializer_class = CustomerSerializer
    pagination_class = CustomerPagination

    def get_queryset(self):
        queryset = self.owner_customers()

        filter_type = self.request.query_params.get("filter", "all")
        code = FILTER_CODES.get(filter_type)
        if code is not None:
            queryset = queryset.filter(code=code)

        query = (self.request.query_params.get("query") or "").strip()
        if query:
            queryset = queryset.filter(Q(fullname__icontains=query) | Q(phone__icontains=query))

        return queryset.order_by("-created")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # مشتری و پیوندش با مالک باید با هم ثبت شوند؛ مشتریِ بی‌مالک در هیچ فهرستی
        # دیده نمی‌شود و عملاً رکوردِ یتیم است
        with db_transaction.atomic():
            customer = serializer.save()
            CustomerOwner.objects.create(customer=customer, owner=request.user)
        return Response(
            {"message": "مشتری جدید با موفقیت ثبت شد.", "customer": self.get_serializer(customer).data},
            status=status.HTTP_201_CREATED,
        )


class CustomerDetailView(OwnerScopedMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomerSerializer

    def get_queryset(self):
        return self.owner_customers()

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        response.data = {"message": "ویرایش مشتری با موفقیت انجام شد.", "customer": response.data}
        return response

    def destroy(self, request, *args, **kwargs):
        super().destroy(request, *args, **kwargs)
        return Response({"message": "حذف مشتری با موفقیت انجام شد."}, status=status.HTTP_200_OK)


# --------------------------------------------------------------- تراکنش‌ها

class TransactionListCreateView(OwnerScopedMixin, generics.ListCreateAPIView):
    """تراکنش‌های یک مشتری + مانده و وضعیت حساب.

    پارامترها: `?filter=today|week|month|year|all`
    فهرست عمداً صفحه‌بندی نمی‌شود: صفحهٔ تراکنش‌ها مانده را روی همان مجموعه نشان
    می‌دهد و صفحه‌بندی یعنی مانده‌ای که فقط بخشی از حساب را می‌گوید.
    """
    serializer_class = TransactionSerializer
    pagination_class = None

    def get_customer(self):
        # کشِ درون‌درخواستی تا list/create دو بار همان کوئری را نزنند
        if not hasattr(self, "_customer"):
            self._customer = self.get_customer_or_404(self.kwargs["customer_id"])
        return self._customer

    def get_queryset(self):
        queryset = Transaction.objects.filter(owner=self.request.user, customer=self.get_customer())
        filter_type = self.request.query_params.get("filter", "all")
        if filter_type != "all":
            queryset = queryset.filter(build_period_query(filter_type))
        return queryset.order_by("-created")

    def list(self, request, *args, **kwargs):
        customer = self.get_customer()
        transactions = self.filter_queryset(self.get_queryset())
        # مانده همیشه روی کلِ حساب حساب می‌شود، نه روی نتیجهٔ فیلترِ دوره —
        # وگرنه «مانده» با عوض کردن فیلتر عوض می‌شود و کاربر را گمراه می‌کند
        remainder = calculate_remainder(customer, request.user)
        return Response({
            "customer": {
                "id": customer.id,
                "fullname": customer.fullname,
                "phone": customer.phone,
                "status": customer.status,
                "code": customer.code,
            },
            "transactions": self.get_serializer(transactions, many=True).data,
            "remainder": remainder,
        })

    def create(self, request, *args, **kwargs):
        customer = self.get_customer()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with db_transaction.atomic():
            serializer.save(customer=customer, owner=request.user)
            remainder, _ = recalculate_account(customer, request.user)
        return Response(
            {"message": "تراکنش جدید با موفقیت ثبت شد.", "transaction": serializer.data, "remainder": remainder},
            status=status.HTTP_201_CREATED,
        )


class TransactionDetailView(OwnerScopedMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        # اسکوپ دوگانه: هم تراکنش مالِ این مالک باشد، هم مشتریِ مسیر مالِ او
        customer = self.get_customer_or_404(self.kwargs["customer_id"])
        return Transaction.objects.filter(owner=self.request.user, customer=customer)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.pop("partial", False))
        serializer.is_valid(raise_exception=True)
        with db_transaction.atomic():
            serializer.save()
            remainder, _ = recalculate_account(instance.customer, request.user)
        return Response({"message": "ویرایش تراکنش با موفقیت انجام شد.",
                         "transaction": serializer.data, "remainder": remainder})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        customer = instance.customer
        with db_transaction.atomic():
            instance.delete()
            remainder, _ = recalculate_account(customer, request.user)
        return Response({"message": "حذف تراکنش با موفقیت انجام شد.", "remainder": remainder},
                        status=status.HTTP_200_OK)


# noinspection PyMethodMayBeStatic
class TransactionSearchView(OwnerScopedMixin, APIView):
    """جستجوی تاریخ شمسی روی تراکنش‌های یک مشتری.

    بدنه: `{"year": {...}, "month": {...}, "day": {...}}` و هر جزء یکی از سه حالتِ
    `specific` / `range` / `custom` — جزئیات در home/services.py.
    POST است نه GET چون ساختارِ تودرتوی جستجو در query string خوانا نمی‌شود.
    """

    def post(self, request, customer_id):
        customer = self.get_customer_or_404(customer_id)
        try:
            data = request.data if isinstance(request.data, dict) else {}
        except ParseError:
            return Response({"message": "فرمت داده‌ها نامعتبر است."}, status=status.HTTP_400_BAD_REQUEST)

        queryset = Transaction.objects.filter(owner=request.user, customer=customer)
        date_query = build_date_search_query(data.get("year"), data.get("month"), data.get("day"))
        if date_query is not None:
            queryset = queryset.filter(date_query)

        return Response({
            "customer": {
                "id": customer.id, "fullname": customer.fullname, "phone": customer.phone,
                "status": customer.status, "code": customer.code,
            },
            "transactions": TransactionSerializer(queryset.order_by("-created"), many=True).data,
            "remainder": calculate_remainder(customer, request.user),
        })
