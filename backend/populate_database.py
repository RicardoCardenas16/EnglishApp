import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Lesson, Topic

def run():
    print("Starting database population...")
    
    # Check if we have B2 content
    if Topic.objects.filter(level="B2").count() == 0:
        print("Populating B2 content...")
        try:
            from populate_b2_lessons import populate_lessons
            populate_lessons()
        except Exception as e:
            print(f"Error populating B2: {e}")

    # Check if we have C1 content
    if Topic.objects.filter(level="C1").count() == 0:
        print("Populating C1 content...")
        try:
            from populate_c1_lessons import populate_c1_lessons
            populate_c1_lessons()
        except Exception as e:
            print(f"Error populating C1: {e}")

    print("Database population complete.")

if __name__ == "__main__":
    run()
