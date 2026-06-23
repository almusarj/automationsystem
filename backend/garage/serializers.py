from rest_framework import serializers

from .models import Customer, Invoice, JobOrder, Vehicle


class VehicleSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            "id", "customer", "customer_name", "make", "model", "year",
            "license_plate", "vin", "color", "odometer", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class CustomerSerializer(serializers.ModelSerializer):
    vehicle_count = serializers.IntegerField(source="vehicles.count", read_only=True)

    class Meta:
        model = Customer
        fields = [
            "id", "full_name", "phone", "email", "address", "notes",
            "vehicle_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CustomerDetailSerializer(CustomerSerializer):
    """Includes nested vehicles — used for the customer detail view."""

    vehicles = VehicleSerializer(many=True, read_only=True)

    class Meta(CustomerSerializer.Meta):
        fields = CustomerSerializer.Meta.fields + ["vehicles"]


class JobOrderSerializer(serializers.ModelSerializer):
    vehicle_display = serializers.CharField(source="vehicle.__str__", read_only=True)
    customer_name = serializers.CharField(
        source="vehicle.customer.full_name", read_only=True
    )
    total_cost = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    has_invoice = serializers.SerializerMethodField()

    class Meta:
        model = JobOrder
        fields = [
            "id", "job_number", "vehicle", "vehicle_display", "customer_name",
            "assigned_mechanic", "description", "diagnosis", "status", "priority",
            "labor_cost", "parts_cost", "total_cost", "has_invoice",
            "created_at", "updated_at", "completed_at",
        ]
        read_only_fields = ["id", "job_number", "created_at", "updated_at"]

    def get_has_invoice(self, obj):
        return hasattr(obj, "invoice")


class InvoiceSerializer(serializers.ModelSerializer):
    job_number = serializers.CharField(source="job_order.job_number", read_only=True)
    customer_name = serializers.CharField(
        source="job_order.vehicle.customer.full_name", read_only=True
    )
    vehicle_display = serializers.CharField(
        source="job_order.vehicle.__str__", read_only=True
    )
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "invoice_number", "job_order", "job_number", "customer_name",
            "vehicle_display", "tax_rate", "amount_paid", "status",
            "subtotal", "tax_amount", "total", "balance_due",
            "issued_at", "due_at",
        ]
        read_only_fields = ["id", "invoice_number", "issued_at"]
