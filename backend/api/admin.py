from django.contrib import admin
from .models import Profile, Lesson, UserLessonProgress

admin.site.register(Profile)
admin.site.register(Lesson)
admin.site.register(UserLessonProgress)
