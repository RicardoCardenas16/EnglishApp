import pyttsx3
import os

def generate_daily_routine_audio():
    # Adjusted text to fit within ~1 minute
    text = """
    Every morning, my alarm goes off at 6 AM. I wake up, stretch, and then head to the kitchen to make coffee. While the coffee brews, I check my emails and plan my day.

    At 7:30, I leave for work. The commute usually takes about thirty minutes by train. During the ride, I like to read a book or listen to a podcast. Once I arrive at the office, I greet my colleagues and start working on my projects. We often have a team meeting before lunch to discuss our progress.

    I finish work around 5 PM and go to the gym for a quick workout. Exercise helps me relax after a busy day. In the evening, I cook a simple dinner and watch some TV. Finally, I read for a bit before going to sleep at 10 PM to be ready for the next day.
    """

    engine = pyttsx3.init()
    
    # Set properties for a nice voice and pace
    engine.setProperty('rate', 150)    # Speed percent (can go over 100)
    engine.setProperty('volume', 1.0)  # Volume 0-1

    # Save the file to the frontend public/assets folder
    output_path = "../frontend/public/assets/daily_routine.mp3"
    abs_output_path = os.path.abspath(output_path)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(abs_output_path), exist_ok=True)
    
    print(f"Generating audio to: {abs_output_path}")
    engine.save_to_file(text, abs_output_path)
    engine.runAndWait()
    print("Audio file generated successfully!")

if __name__ == "__main__":
    generate_daily_routine_audio()
