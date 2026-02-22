from django.urls import path, include
from rest_framework import routers
from .views import CustomAuthToken, DashboardViewSet, TopicViewSet, LessonViewSet, UserProgressViewSet, RegisterView, WritingEvaluationViewSet, PlacementTestViewSet

router = routers.DefaultRouter()
# /api/topics/
router.register(r'topics', TopicViewSet, basename='topics')
# /api/lessons/
router.register(r'lessons', LessonViewSet)
# /api/progress/
router.register(r'progress', UserProgressViewSet, basename='progress')
# /api/evaluate-writing/
router.register(r'evaluate-writing', WritingEvaluationViewSet, basename='evaluate-writing')
# /api/placement-test/
router.register(r'placement-test', PlacementTestViewSet, basename='placement-test')

urlpatterns = [
    # Login endpoint: /api/login/
    path('login/', CustomAuthToken.as_view()),
    
    # Register endpoint: /api/register/
    path('register/', RegisterView.as_view()),
    
    # Dashboard endpoint: /api/dashboard/
    path('dashboard/', DashboardViewSet.as_view({'get': 'list'})),
    
    # Include router URLs (CRUD for lessons, etc)
    path('', include(router.urls)),
]
