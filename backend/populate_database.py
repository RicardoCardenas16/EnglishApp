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
        count = Topic.objects.filter(level=level).count()
        print(f"Level {level} has {count} topics.")
        
        if count < 5:
            print(f"Attempting to add more content for {level}...")
            try:
                if level == "B2":
                    try:
                        from seed_from_json import seed_b2
                        seed_b2()
                    except ImportError:
                        from populate_remaining_b2 import populate_remaining
                        populate_remaining()
                elif level == "C1":
                    from populate_c1_lessons import populate_c1_lessons
                    populate_c1_lessons()
                else:
                    print(f"No specific population logic for {level} yet.")
            except Exception as e:
                print(f"Error populating {level}: {e}")

    # Final pass to ensure all audios exist and URLs are correct
    try:
        from generate_missing_audios import run as generate_audios
        generate_audios()
    except Exception as e:
        print(f"Error in final audio generation pass: {e}")

    print("Database population complete.")

if __name__ == "__main__":
    run()
