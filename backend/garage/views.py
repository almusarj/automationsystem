from django.db.models import Count
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Customer, Invoice, JobOrder, Vehicle
from .serializers import (
    CustomerDetailSerializer,
    CustomerSerializer,
    InvoiceSerializer,
    JobOrderSerializer,
    VehicleSerializer,
)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().prefetch_related("vehicles")
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["full_name", "phone", "email"]
    ordering_fields = ["full_name", "created_at"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CustomerDetailSerializer
        return CustomerSerializer


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all().select_related("customer")
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["make", "model", "license_plate", "vin", "customer__full_name"]
    ordering_fields = ["created_at", "year"]

    def get_queryset(self):
        qs = super().get_queryset()
        customer_id = self.request.query_params.get("customer")
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        return qs


class JobOrderViewSet(viewsets.ModelViewSet):
    queryset = JobOrder.objects.all().select_related("vehicle", "vehicle__customer")
    serializer_class = JobOrderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "job_number", "description", "vehicle__license_plate",
        "vehicle__customer__full_name",
    ]
    ordering_fields = ["created_at", "updated_at", "priority", "status"]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        vehicle_id = self.request.query_params.get("vehicle")
        if vehicle_id:
            qs = qs.filter(vehicle_id=vehicle_id)
        return qs

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.status == JobOrder.STATUS_COMPLETED and not instance.completed_at:
            instance.completed_at = timezone.now()
            instance.save(update_fields=["completed_at"])


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().select_related(
        "job_order", "job_order__vehicle", "job_order__vehicle__customer"
    )
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["invoice_number", "job_order__job_number"]
    ordering_fields = ["issued_at", "due_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def perform_create(self, serializer):
        invoice = serializer.save()
        job = invoice.job_order
        job.status = JobOrder.STATUS_INVOICED
        job.save(update_fields=["status"])

    @action(detail=True, methods=["post"])
    def record_payment(self, request, pk=None):
        """Add a payment amount to this invoice and update its status."""
        from decimal import Decimal, InvalidOperation

        invoice = self.get_object()
        try:
            amount = Decimal(str(request.data.get("amount", 0)))
        except (TypeError, InvalidOperation):
            return Response(
                {"detail": "amount must be a number."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if amount <= 0:
            return Response(
                {"detail": "amount must be greater than zero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invoice.amount_paid = invoice.amount_paid + amount
        if invoice.amount_paid >= invoice.total:
            invoice.status = Invoice.STATUS_PAID
        elif invoice.amount_paid > 0:
            invoice.status = Invoice.STATUS_PARTIAL
        invoice.save()
        return Response(InvoiceSerializer(invoice).data)


class DashboardView(viewsets.ViewSet):
    """Read-only aggregate stats for the dashboard landing page."""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        open_statuses = [
            JobOrder.STATUS_OPEN,
            JobOrder.STATUS_IN_PROGRESS,
            JobOrder.STATUS_ON_HOLD,
        ]
        jobs_by_status = dict(
            JobOrder.objects.values("status")
            .annotate(count=Count("id"))
            .values_list("status", "count")
        )
        unpaid_invoices = Invoice.objects.exclude(status=Invoice.STATUS_PAID)
        outstanding_balance = sum((inv.balance_due for inv in unpaid_invoices), start=0)

        revenue_this_month = Invoice.objects.filter(
            issued_at__year=timezone.now().year,
            issued_at__month=timezone.now().month,
        )
        revenue_total = sum((inv.total for inv in revenue_this_month), start=0)

        return Response(
            {
                "total_customers": Customer.objects.count(),
                "total_vehicles": Vehicle.objects.count(),
                "open_jobs": JobOrder.objects.filter(status__in=open_statuses).count(),
                "jobs_by_status": jobs_by_status,
                "unpaid_invoice_count": unpaid_invoices.count(),
                "outstanding_balance": float(outstanding_balance),
                "revenue_this_month": float(revenue_total),
                "recent_jobs": JobOrderSerializer(
                    JobOrder.objects.select_related(
                        "vehicle", "vehicle__customer"
                    ).order_by("-created_at")[:5],
                    many=True,
                ).data,
            }
        )
