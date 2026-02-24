import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import Profile

for u in User.objects.all():
    try:
        p = u.profile
        print(f"User: {u.username} | Email: {u.email} | Level: {p.level} | Test: {p.has_completed_placement_test}")
    except:
        print(f"User: {u.username} | No Profile")
