import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Lesson, Topic

def run():
    print("Starting database population...")
    
    # Levels to check
    levels = ["A1", "A2", "B1", "B2", "C1"]
    
    for level in levels:
        if Topic.objects.filter(level=level).count() == 0:
            print(f"Populating {level} content...")
            try:
                if level == "B2":
                    from populate_b2_lessons import populate_lessons
                    populate_lessons()
                elif level == "C1":
                    from populate_c1_lessons import populate_c1_lessons
                    populate_c1_lessons()
                else:
                    # Generic population logic for A1/A2/B1
                    print(f"Note: No specific script for {level}, skipping or using placeholder logic.")
            except Exception as e:
                print(f"Error populating {level}: {e}")

    print("Database population complete.")

if __name__ == "__main__":
    run()
