import os
import django
import json
import time
import google.generativeai as genai
from gtts import gTTS

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Lesson, Topic

# Configure Gemini
API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=API_KEY)

THEMES_C1 = [
    "Global Economics & Emerging Markets",
    "Philosophy & Ethics in the 21st Century",
    "Advanced Scientific Innovations & Biotechnology",
    "Political Systems & Comparative Government",
    "Advanced Linguistics & Psychology",
    "High-Level Business Strategy & Leadership",
    "Technological Singularities & Digital Identity",
    "The Arts, Aesthetics & Critical Theory",
    "Legal Systems & International Law",
    "Complex Sociological Structures & Urban Planning"
]

def generate_theme_content(theme_name, level="C1"):
    prompt = f"""
    Generate 5 English lessons for a {level} (Advanced) student for the theme: "{theme_name}".
    Return a JSON object with exactly 5 keys: "LISTENING", "READING", "SPEAKING", "WRITING", "QUIZ".
    
    Structure:
    - LISTENING: {{ "title": "Listening: {theme_name}", "description": "Listen to a sophisticated lecture about {theme_name}", "transcript": "A 300-word complex text with advanced vocabulary for someone to read.", "context": "Academic/Professional context" }}
    - READING: {{ "title": "Reading: {theme_name}", "description": "Analyze an academic article about {theme_name}", "content": "A 500-word high-level analytical text with complex syntax." }}
    - SPEAKING: {{ "title": "Speaking: {theme_name}", "description": "Engage in a deep debate on {theme_name}", "questions": [ 3 complex questions with "text", "ideal_answer", "feedback" ] }}
    - WRITING: {{ "title": "Writing: {theme_name}", "description": "Write a formal critique or research abstract on {theme_name}", "prompt": "A complex task requiring critical analysis (~250 words).", "min_words": 200 }}
    - QUIZ: {{ "title": "Analytical Quiz: {theme_name}", "description": "Verify your advanced comprehension of {theme_name}", "questions": [ 8 multiple choice questions (with 4 nuanced options) based on the content above. Include "question", "options", "answer", "feedback" ] }}

    The level must be {level} level (Sophisticated language, C1-level collocations, and high-order thinking).
    Return ONLY the raw JSON.
    """
    
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt)
    text = response.text
    
    # Clean JSON
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    
    return json.loads(text.strip())

def populate_c1_lessons():
    # We DON'T delete all lessons, only C1 for this script or just add if they don't exist
    print("Populating C1 lessons...")
    
    # Ensure assets directory exists for audio
    assets_dir = os.path.join(os.getcwd(), "staticfiles", "assets")
    os.makedirs(assets_dir, exist_ok=True)
    
    current_topic_order = Topic.objects.filter(level="C1").count() + 1
    
    for theme in THEMES_C1:
        if Topic.objects.filter(title=theme, level="C1").exists():
            print(f"Skipping {theme}, already exists.")
            continue
            
        print(f"Generating C1 theme: {theme}...")
        try:
            content = generate_theme_content(theme, "C1")
            
            # Create Topic
            topic = Topic.objects.create(
                title=theme,
                description=f"Sophisticated English mastery in {theme}",
                level="C1",
                order=current_topic_order
            )
            
            lesson_order = 1
            for l_type in ["LISTENING", "READING", "SPEAKING", "WRITING", "QUIZ"]:
                data = content[l_type]
                
                # Note: On Render, file system is ephemeral, 
                # but we generate them anyway for immediate consistency if possible.
                # In production we should use S3, but for this project we're using local storage/Whitenoise.
                
                if l_type == "LISTENING":
                    audio_filename = f"topic_{topic.id}_listening.mp3"
                    # Try to save to a relative path that whitenoise might find
                    audio_path = os.path.join(assets_dir, audio_filename)
                    
                    transcript = data.get("transcript", "")
                    if transcript:
                        try:
                            tts = gTTS(text=transcript, lang='en')
                            tts.save(audio_path)
                            data["audio_url"] = f"/static/assets/{audio_filename}"
                        except:
                            data["audio_url"] = "/static/assets/daily_routine.mp3"
                    else:
                        data["audio_url"] = "/static/assets/daily_routine.mp3"
                
                Lesson.objects.create(
                    topic=topic,
                    title=data["title"],
                    description=data.get("description", ""),
                    type=l_type,
                    level="C1",
                    order=lesson_order,
                    content_json=data
                )
                lesson_order += 1
            
            current_topic_order += 1
            print(f"Success for C1 theme: {theme}")
            time.sleep(2) # Avoid rate limits
            
        except Exception as e:
            print(f"Error generating {theme}: {e}")

if __name__ == "__main__":
    populate_c1_lessons()
