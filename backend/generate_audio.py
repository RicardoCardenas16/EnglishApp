from gtts import gTTS
import os

def generate_daily_routine_audio():
    # Adjusted text to fit within ~1 minute when spoken at normal speed (approx 130-150 words)
    text = """
    Every morning, my alarm goes off at 6 AM. I wake up, stretch, and then head to the kitchen to make coffee. While the coffee brews, I check my emails and plan my day.

    At 7:30, I leave for work. The commute usually takes about thirty minutes by train. During the ride, I like to read a book or listen to a podcast. Once I arrive at the office, I greet my colleagues and start working on my projects. We often have a team meeting before lunch to discuss our progress.

    I finish work around 5 PM and go to the gym for a quick workout. Exercise helps me relax after a busy day. In the evening, I cook a simple dinner and watch some TV. Finally, I read for a bit before going to sleep at 10 PM to be ready for the next day.
    """

    # Generate audio file
    tts = gTTS(text=text, lang='en', slow=False)
    
    # Save the file to the frontend public/assets folder so it can be served
    output_path = "../frontend/public/assets/daily_routine.mp3"
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    tts.save(output_path)
    print(f"Audio file generated at: {output_path}")

if __name__ == "__main__":
    generate_daily_routine_audio()
