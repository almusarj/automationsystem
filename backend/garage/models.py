import uuid

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class Customer(models.Model):
    """A garage customer — the person who owns the vehicle(s)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class Vehicle(models.Model):
    """A vehicle belonging to a customer."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="vehicles"
    )
    make = models.CharField(max_length=80)
    model = models.CharField(max_length=80)
    year = models.PositiveIntegerField()
    license_plate = models.CharField(max_length=20)
    vin = models.CharField("VIN", max_length=32, blank=True)
    color = models.CharField(max_length=40, blank=True)
    odometer = models.PositiveIntegerField(default=0, help_text="Odometer reading in km/mi")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.year} {self.make} {self.model} ({self.license_plate})"


class JobOrder(models.Model):
    """A repair / service job ticket for a vehicle."""

    STATUS_OPEN = "open"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_ON_HOLD = "on_hold"
    STATUS_COMPLETED = "completed"
    STATUS_INVOICED = "invoiced"
    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_ON_HOLD, "On Hold"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_INVOICED, "Invoiced"),
    ]

    PRIORITY_LOW = "low"
    PRIORITY_NORMAL = "normal"
    PRIORITY_HIGH = "high"
    PRIORITY_CHOICES = [
        (PRIORITY_LOW, "Low"),
        (PRIORITY_NORMAL, "Normal"),
        (PRIORITY_HIGH, "High"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job_number = models.CharField(max_length=20, unique=True, editable=False)
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE, related_name="job_orders"
    )
    assigned_mechanic = models.CharField(max_length=120, blank=True)
    description = models.TextField(help_text="What the customer reported / requested")
    diagnosis = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN
    )
    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default=PRIORITY_NORMAL
    )
    labor_cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)]
    )
    parts_cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.job_number:
            year = timezone.now().year
            last = (
                JobOrder.objects.filter(job_number__startswith=f"JOB-{year}-")
                .order_by("-job_number")
                .first()
            )
            seq = int(last.job_number.split("-")[-1]) + 1 if last else 1
            self.job_number = f"JOB-{year}-{seq:04d}"
        super().save(*args, **kwargs)

    @property
    def total_cost(self):
        return self.labor_cost + self.parts_cost

    def __str__(self):
        return f"{self.job_number} — {self.vehicle}"


class Invoice(models.Model):
    """An invoice generated from a completed job order."""

    STATUS_UNPAID = "unpaid"
    STATUS_PARTIAL = "partial"
    STATUS_PAID = "paid"
    STATUS_CHOICES = [
        (STATUS_UNPAID, "Unpaid"),
        (STATUS_PARTIAL, "Partially Paid"),
        (STATUS_PAID, "Paid"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=20, unique=True, editable=False)
    job_order = models.OneToOneField(
        JobOrder, on_delete=models.CASCADE, related_name="invoice"
    )
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Tax rate as a percentage, e.g. 8.5",
    )
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=STATUS_UNPAID
    )
    issued_at = models.DateTimeField(auto_now_add=True)
    due_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-issued_at"]

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            year = timezone.now().year
            last = (
                Invoice.objects.filter(invoice_number__startswith=f"INV-{year}-")
                .order_by("-invoice_number")
                .first()
            )
            seq = int(last.invoice_number.split("-")[-1]) + 1 if last else 1
            self.invoice_number = f"INV-{year}-{seq:04d}"
        super().save(*args, **kwargs)

    @property
    def subtotal(self):
        return self.job_order.total_cost

    @property
    def tax_amount(self):
        from decimal import Decimal, ROUND_HALF_UP

        amount = self.subtotal * self.tax_rate / Decimal("100")
        return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @property
    def total(self):
        return self.subtotal + self.tax_amount

    @property
    def balance_due(self):
        return self.total - self.amount_paid

    def __str__(self):
        return self.invoice_number
