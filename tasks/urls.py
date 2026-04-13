from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, TaskMetadataViewSet

router = DefaultRouter()
router.register(r'metadata', TaskMetadataViewSet, basename='task-metadata')
router.register(r'', TaskViewSet, basename='tasks')

urlpatterns = router.urls
