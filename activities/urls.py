from rest_framework.routers import DefaultRouter
from .views import ActivityViewSet, MessageViewSet

router = DefaultRouter()
router.register(r'messages', MessageViewSet, basename='messages')
router.register(r'', ActivityViewSet, basename='activities')

urlpatterns = router.urls
