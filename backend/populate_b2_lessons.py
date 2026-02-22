import os
import django
import json
import time
import google.generativeai as genai

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Lesson, Topic

# Configure Gemini
API_KEY = "AIzaSyBHT7AcrvyAIoR8dLbbNqm4TO6hAXSB54w"
genai.configure(api_key=API_KEY)

THEMES = [
    "Breaking News & Media Literacy",
    "Literary Criticism & Modern Books",
    "The Modern Job Interview & Professional Branding",
    "Environmental Ethics & Sustainability",
    "Global Travel & Cultural Adaptation",
    "The Impact of AI & Future of Work",
    "Psychology & Emotional Intelligence",
    "Social Justice & Global Citizenship",
    "Cinema, Pop Culture & Social Media Impact",
    "Work-Life Balance & Advanced Daily Routines"
]

from gtts import gTTS

def generate_theme_content(theme_name):
    prompt = f"""
    Generate 5 English lessons for a B2 (Upper Intermediate) student for the theme: "{theme_name}".
    Return a JSON object with exactly 5 keys: "LISTENING", "READING", "SPEAKING", "WRITING", "QUIZ".
    
    Structure:
    - LISTENING: {{ "title": "Listening: {theme_name}", "description": "Listen to a monologue about {theme_name}", "transcript": "A 200-word monologue text for someone to read.", "context": "Topic context" }}
    - READING: {{ "title": "Reading: {theme_name}", "description": "Read about {theme_name}", "content": "A 400-word academic/professional text." }}
    - SPEAKING: {{ "title": "Speaking: {theme_name}", "description": "Practice speaking on {theme_name}", "questions": [ 3 open questions with "text", "ideal_answer", "feedback" ] }}
    - WRITING: {{ "title": "Writing: {theme_name}", "description": "Write an essay on {theme_name}", "prompt": "An essay or article prompt requiring ~150 words.", "min_words": 100 }}
    - QUIZ: {{ "title": "Final Quiz: {theme_name}", "description": "Test your knowledge on {theme_name}", "questions": [ 8 multiple choice questions (4 from reading, 4 from listening transcript) with "question", "options", "answer", "feedback" ] }}

    The level must be B2 level (complex grammar and nuanced vocabulary).
    Return ONLY the raw JSON.
    """
    
    model = genai.GenerativeModel('gemini-flash-latest')
    response = model.generate_content(prompt)
    text = response.text
    
    # Clean JSON
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    
    return json.loads(text.strip())

def populate_lessons():
    # Clear existing data
    Lesson.objects.all().delete()
    Topic.objects.all().delete()
    print("Cleaned up existing Topics and Lessons.")
    
    # Ensure assets directory exists
    assets_dir = "../frontend/public/assets"
    os.makedirs(assets_dir, exist_ok=True)
    
    current_topic_order = 1
    
    for theme in THEMES:
        print(f"Generating theme: {theme}...")
        try:
            content = generate_theme_content(theme)
            
            # Create Topic
            topic = Topic.objects.create(
                title=theme,
                description=f"Master English through the topic of {theme}",
                level="B2",
                order=current_topic_order
            )
            
            lesson_order = 1
            for l_type in ["LISTENING", "READING", "SPEAKING", "WRITING", "QUIZ"]:
                data = content[l_type]
                
                # Generate real audio for listening
                if l_type == "LISTENING":
                    audio_filename = f"topic_{topic.id}_listening.mp3"
                    audio_path = os.path.join(assets_dir, audio_filename)
                    
                    transcript = data.get("transcript", "")
                    if transcript:
                        print(f"Generating audio for topic: {theme}...")
                        tts = gTTS(text=transcript, lang='en')
                        tts.save(audio_path)
                        data["audio_url"] = f"/assets/{audio_filename}"
                    else:
                        data["audio_url"] = "/assets/daily_routine.mp3" # Fallback
                
                Lesson.objects.create(
                    topic=topic,
                    title=data["title"],
                    description=data.get("description", ""),
                    type=l_type,
                    level="B2",
                    order=lesson_order,
                    content_json=data
                )
                lesson_order += 1
            
            current_topic_order += 1
            print(f"Success for theme: {theme}")
            time.sleep(5) # Avoid rate limits
            
        except Exception as e:
            print(f"Error generating {theme}: {e}")

if __name__ == "__main__":
    populate_lessons()
