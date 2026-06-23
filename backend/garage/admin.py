from django.contrib import admin

from .models import Customer, Invoice, JobOrder, Vehicle


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ["full_name", "phone", "email", "created_at"]
    search_fields = ["full_name", "phone", "email"]


class VehicleInline(admin.TabularInline):
    model = Vehicle
    extra = 0


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ["__str__", "customer", "year", "license_plate"]
    search_fields = ["make", "model", "license_plate", "vin"]
    list_filter = ["make", "year"]


@admin.register(JobOrder)
class JobOrderAdmin(admin.ModelAdmin):
    list_display = ["job_number", "vehicle", "status", "priority", "total_cost", "created_at"]
    list_filter = ["status", "priority"]
    search_fields = ["job_number", "description", "vehicle__license_plate"]
    readonly_fields = ["job_number"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "job_order", "status", "total", "balance_due", "issued_at"]
    list_filter = ["status"]
    search_fields = ["invoice_number", "job_order__job_number"]
    readonly_fields = ["invoice_number"]
