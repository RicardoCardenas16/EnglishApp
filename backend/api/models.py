from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    level_choices = [
        ('A1', 'A1 Beginner'),
        ('A2', 'A2 Basic'),
        ('B1', 'B1 Intermediate'),
        ('B2', 'B2 Upper Intermediate'),
        ('C1', 'C1 Advanced'),
    ]
    level = models.CharField(max_length=2, choices=level_choices, default='A1')
    progress_reading = models.IntegerField(default=0)
    progress_listening = models.IntegerField(default=0)
    progress_speaking = models.IntegerField(default=0)
    progress_writing = models.IntegerField(default=0)
    streak_days = models.IntegerField(default=0)
    total_time_hours = models.IntegerField(default=0)
    profile_picture_url = models.URLField(max_length=500, blank=True, null=True)
    has_completed_placement_test = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {self.level}"

class Topic(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    level = models.CharField(max_length=2, choices=Profile.level_choices)
    order = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.level} - {self.title}"

class Lesson(models.Model):
    TYPE_CHOICES = [
        ('READING', 'Reading'),
        ('LISTENING', 'Listening'),
        ('SPEAKING', 'Speaking'),
        ('WRITING', 'Writing'),
        ('GRAMMAR', 'Grammar'),
        ('VOCABULARY', 'Vocabulary'),
        ('QUIZ', 'Quiz'),
    ]
    
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='lessons', null=True, blank=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    level = models.CharField(max_length=2, choices=Profile.level_choices)
    order = models.IntegerField(default=0)
    content_json = models.JSONField(default=dict, blank=True)  # Store flexible content structure

    def __str__(self):
        return f"{self.level} - {self.type} - {self.title}"

class UserLessonProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    score = models.IntegerField(default=0) # 0-100
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'lesson')

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title}"
