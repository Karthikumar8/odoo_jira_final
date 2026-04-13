from rest_framework.routers import DefaultRouter
from .views import ReportingViewSet

router = DefaultRouter()
router.register(r'', ReportingViewSet, basename='reporting')

urlpatterns = router.urls
