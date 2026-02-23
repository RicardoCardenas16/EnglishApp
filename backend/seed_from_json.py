import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Lesson, Topic

def seed_b2():
    json_path = os.path.join(os.path.dirname(__file__), 'b2_generated_content.json')
    if not os.path.exists(json_path):
        print("B2 JSON file not found.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Path for static assets
    static_assets_dir = os.path.join(os.getcwd(), "static", "assets")
    os.makedirs(static_assets_dir, exist_ok=True)

    current_topic_order = Topic.objects.filter(level="B2").count() + 1
    
    for entry in data:
        theme = entry['theme']
        content = entry['content']
        
        if Topic.objects.filter(title=theme, level="B2").exists():
            print(f"Skipping {theme}, already exists.")
            continue
            
        print(f"Seeding B2 theme from JSON: {theme}...")
        topic = Topic.objects.create(
            title=theme,
            description=f"Master English through the topic of {theme}",
            level="B2",
            order=current_topic_order
        )
        
        lesson_order = 1
        for l_type, l_data in content.items():
            # Handle key mapping if necessary (e.g. LISTENING, READING, etc.)
            
            # Use a dummy audio for now if not generated, 
            # or we could run gTTS here too.
            if l_type == "LISTENING":
                # For pre-seeded items, we might not have specific audio, 
                # but we can use the default or generate once.
                l_data["audio_url"] = "/static/assets/daily_routine.mp3"

            Lesson.objects.create(
                topic=topic,
                title=l_data.get("title", f"{l_type}: {theme}"),
                description=l_data.get("description", ""),
                type=l_type,
                level="B2",
                order=lesson_order,
                content_json=l_data
            )
            lesson_order += 1
        
        current_topic_order += 1

if __name__ == "__main__":
    seed_b2()
