from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, Topic, Lesson, UserLessonProgress

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Profile
        fields = '__all__'

class LessonSerializer(serializers.ModelSerializer):
    topic_title = serializers.ReadOnlyField(source='topic.title')
    
    class Meta:
        model = Lesson
        fields = '__all__'

class TopicSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    
    class Meta:
        model = Topic
        fields = '__all__'

class UserLessonProgressSerializer(serializers.ModelSerializer):
    lesson = LessonSerializer(read_only=True)
    lesson_id = serializers.PrimaryKeyRelatedField(
        queryset=Lesson.objects.all(), source='lesson', write_only=True
    )
    
    class Meta:
        model = UserLessonProgress
        fields = '__all__'
