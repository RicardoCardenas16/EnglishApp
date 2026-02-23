import os
import django
from gtts import gTTS

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Lesson

def run():
    print("Checking for missing audio files...")
    
    # Path for static assets (using backend root to match settings.py)
    static_assets_dir = os.path.join(os.getcwd(), "static", "assets")
    os.makedirs(static_assets_dir, exist_ok=True)
    
    # Special case for the generic fallback
    fallback_path = os.path.join(static_assets_dir, "daily_routine.mp3")
    if not os.path.exists(fallback_path):
        print("Generating fallback audio (daily_routine.mp3)...")
        text = "This is a daily routine recording. My day typically begins at six thirty AM when my alarm goes off."
        tts = gTTS(text=text, lang='en')
        tts.save(fallback_path)

    listening_lessons = Lesson.objects.filter(type="LISTENING")
    print(f"Found {listening_lessons.count()} listening lessons.")

    for lesson in listening_lessons:
        content = lesson.content_json
        # Expected filename based on our conventions
        audio_filename = f"topic_{lesson.topic.id}_listening.mp3" if lesson.topic else "daily_routine.mp3"
        audio_path = os.path.join(static_assets_dir, audio_filename)
        
        # Update URL in database to be consistent with our new static path
        correct_url = f"/static/assets/{audio_filename}"
        if content.get("audio_url") != correct_url:
            print(f"Updating URL for lesson: {lesson.title}")
            content["audio_url"] = correct_url
            lesson.save()

        if not os.path.exists(audio_path):
            transcript = content.get("transcript", "")
            if not transcript:
                # Fallback to description or title if transcript is missing
                transcript = content.get("description", lesson.title)
            
            print(f"Generating audio for: {lesson.title}")
            try:
                tts = gTTS(text=transcript, lang='en')
                tts.save(audio_path)
            except Exception as e:
                print(f"Error generating audio for {lesson.title}: {e}")

    print("Audio check complete.")

if __name__ == "__main__":
    run()
