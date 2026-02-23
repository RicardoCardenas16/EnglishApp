import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Topic, Lesson

def check():
    for level in ["A1", "A2", "B1", "B2", "C1"]:
        count = Topic.objects.filter(level=level).count()
        print(f"Level {level}: {count} topics")
        if count > 0:
            topics = Topic.objects.filter(level=level).order_by('order')
            for t in topics:
                print(f"  - [{t.order}] {t.title} ({t.lessons.count()} lessons)")

if __name__ == "__main__":
    check()
