from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()

urlpatterns = [
    path('auth/', include('accounts.urls')),
    path('projects/', include('projects.urls')),
    path('stages/', include('stages.urls')),
    path('tasks/', include('tasks.urls')),
    path('timesheets/', include('timesheets.urls')),
    path('milestones/', include('milestones.urls')),
    path('activities/', include('activities.urls')),
    path('updates/', include('updates.urls')),
    path('reporting/', include('reporting.urls')),
    path('', include(router.urls)),
]
