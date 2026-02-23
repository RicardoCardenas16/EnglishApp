import os
import django
import json
from gtts import gTTS

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

    # Path for static assets (using backend root to match settings.py)
    static_assets_dir = os.path.join(os.getcwd(), "static", "assets")
    os.makedirs(static_assets_dir, exist_ok=True)

    current_topic_order = Topic.objects.filter(level="B2").count() + 1
    
    for entry in data:
        theme = entry['theme']
        content = entry['content']
        
        if Topic.objects.filter(title=theme, level="B2").exists():
            # Check if listening audio exists, if not, generate it
            topic = Topic.objects.get(title=theme, level="B2")
            listening_lesson = Lesson.objects.filter(topic=topic, type="LISTENING").first()
            if listening_lesson:
                audio_filename = f"topic_{topic.id}_listening.mp3"
                audio_path = os.path.join(static_assets_dir, audio_filename)
                if not os.path.exists(audio_path):
                    transcript = listening_lesson.content_json.get("transcript", "")
                    if transcript:
                        print(f"Generating missing audio for existing theme: {theme}...")
                        try:
                            tts = gTTS(text=transcript, lang='en')
                            tts.save(audio_path)
                            listening_lesson.content_json["audio_url"] = f"/static/assets/{audio_filename}"
                            listening_lesson.save()
                        except Exception as e:
                            print(f"Error generating audio: {e}")
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
            if l_type == "LISTENING":
                audio_filename = f"topic_{topic.id}_listening.mp3"
                audio_path = os.path.join(static_assets_dir, audio_filename)
                
                transcript = l_data.get("transcript", "")
                if transcript:
                    print(f"Generating audio for topic: {theme}...")
                    try:
                        tts = gTTS(text=transcript, lang='en')
                        tts.save(audio_path)
                        l_data["audio_url"] = f"/static/assets/{audio_filename}"
                    except Exception as e:
                        print(f"Error generating audio: {e}")
                        l_data["audio_url"] = "/static/assets/daily_routine.mp3"
                else:
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
