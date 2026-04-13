from rest_framework.routers import DefaultRouter
from .views import MilestoneViewSet

router = DefaultRouter()
router.register(r'', MilestoneViewSet, basename='milestones')

urlpatterns = router.urls
