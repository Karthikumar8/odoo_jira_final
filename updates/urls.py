from rest_framework.routers import DefaultRouter
from .views import ProjectUpdateViewSet

router = DefaultRouter()
router.register(r'', ProjectUpdateViewSet, basename='updates')

urlpatterns = router.urls
