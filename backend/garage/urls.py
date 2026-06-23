from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CustomerViewSet, DashboardView, InvoiceViewSet, JobOrderViewSet, VehicleViewSet

router = DefaultRouter()
router.register(r"customers", CustomerViewSet, basename="customer")
router.register(r"vehicles", VehicleViewSet, basename="vehicle")
router.register(r"jobs", JobOrderViewSet, basename="joborder")
router.register(r"invoices", InvoiceViewSet, basename="invoice")
router.register(r"dashboard", DashboardView, basename="dashboard")

urlpatterns = [
    path("", include(router.urls)),
]
