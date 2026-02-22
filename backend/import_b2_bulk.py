import os
import django
import json
from gtts import gTTS

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Lesson, Topic

def import_b2_content(json_file):
    if not os.path.exists(json_file):
        print(f"Error: {json_file} not found.")
        return

    with open(json_file, 'r', encoding='utf-8') as f:
        data_list = json.load(f)

    assets_dir = "../frontend/public/assets"
    os.makedirs(assets_dir, exist_ok=True)

    # We start from current max order or fresh? 
    # Usually better to clear or append. Let's append if topic doesn't exist.
    
    for item in data_list:
        theme_title = item['theme']
        print(f"Importing: {theme_title}...")
        
        # Get or create Topic
        topic, created = Topic.objects.get_or_create(
            title=theme_title,
            defaults={
                'description': f"Master English through the topic of {theme_title}",
                'level': "B2",
                'order': Topic.objects.count() + 1
            }
        )
        
        if not created:
            # If it exists, clear its lessons to overwrite with new order/content
            Lesson.objects.filter(topic=topic).delete()
            print(f"  Refreshing lessons for {theme_title}")

        content = item['content']
        lesson_order = 1
        
        for l_type in ["LISTENING", "READING", "SPEAKING", "WRITING", "QUIZ"]:
            lesson_data = content[l_type]
            
            # Generate audio for Listening locally
            if l_type == "LISTENING":
                audio_filename = f"topic_{topic.id}_listening.mp3"
                audio_path = os.path.join(assets_dir, audio_filename)
                transcript = lesson_data.get("transcript", "")
                
                if transcript:
                    print(f"  Generating audio for {theme_title}...")
                    try:
                        tts = gTTS(text=transcript, lang='en')
                        tts.save(audio_path)
                        lesson_data["audio_url"] = f"/assets/{audio_filename}"
                    except Exception as audio_e:
                        print(f"  Audio Error: {audio_e}")
                        lesson_data["audio_url"] = "/assets/daily_routine.mp3"
                else:
                    lesson_data["audio_url"] = "/assets/daily_routine.mp3"

            Lesson.objects.create(
                topic=topic,
                title=lesson_data["title"],
                description=lesson_data.get("description", ""),
                type=l_type,
                level="B2",
                order=lesson_order,
                content_json=lesson_data
            )
            lesson_order += 1
            
        print(f"  Successfully imported {theme_title}")

if __name__ == "__main__":
    import_b2_content('b2_generated_content.json')
