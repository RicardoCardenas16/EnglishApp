import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Lesson

def seed_daily_routine():
    # Clear existing lessons
    Lesson.objects.all().delete()
    print("Deleted existing lessons.")

    # Shared Context (The Daily Routine Story)
    routine_text = """
    My day typically begins at 6:30 AM when my alarm goes off. I try not to hit the snooze button, as I prefer having enough time to get ready without rushing. After a quick shower, I head to the kitchen to prepare a balanced breakfast and a large cup of coffee, which is essential for my morning focus.

    By 7:45 AM, I start my commute. I usually listen to a podcast to make the journey more productive. I arrive at the office by 8:30 AM, check my emails, and prioritize my tasks. My mornings are usually the busiest, filled with meetings and collaborative projects.

    I take a one-hour lunch break at noon to recharge and chat with colleagues. In the afternoon, I wrap up my pending reports before heading home around 5:30 PM. Once home, I like to decompress by exercising or cooking dinner. To wind down, I usually read a book or watch a show. Finally, I turn in by 10:30 PM to ensure I get a solid eight hours of sleep.
    """

    # 1. LISTENING
    Lesson.objects.create(
        title="Daily Routine - Listening",
        description="Listen to the daily routine of a professional. Focus on understanding the flow of events.",
        type="LISTENING",
        level="B1-B2",
        order=1,
        content_json={
            "audio_url": "/assets/daily_routine.mp3", # Local file served from public/assets
            "word": "Listen to the full routine.",
            "duration": "1:00",
            "context": "Professional Daily Routine"
        }
    )

    # 2. READING
    Lesson.objects.create(
        title="Daily Routine - Reading",
        description="Read the transcript. Click on words you don't know to highlight them.",
        type="READING",
        level="B1-B2",
        order=2,
        content_json={
            "blocks": [
                {
                    "type": "text", 
                    "content": routine_text
                }
            ]
        }
    )

    # 3. QUIZ 
    questions = [
        {
            "question": "What time does the narrator's alarm generally go off?",
            "options": ["5:30 AM", "6:00 AM", "6:30 AM", "7:00 AM"],
            "answer": "6:30 AM",
            "feedback": "The text states: 'My day typically begins at 6:30 AM when my alarm goes off.'"
        },
        {
            "question": "Why does the narrator avoid hitting the snooze button?",
            "options": ["To get to work early", "To have time to get ready without rushing", "Because the alarm is too loud", "Because he is already awake"],
            "answer": "To have time to get ready without rushing",
            "feedback": "The narrator prefers 'having enough time to get ready without rushing'."
        },
        {
            "question": "What does the narrator consider essential for morning focus?",
            "options": ["A cold shower", "Checking emails immediately", "A large cup of coffee", "A heavy breakfast"],
            "answer": "A large cup of coffee",
            "feedback": "The text mentions 'a large cup of coffee, which is essential for my morning focus.'"
        },
        {
            "question": "How does the narrator make the commute more productive?",
            "options": ["By making phone calls", "By sleeping", "By listening to a podcast", "By checking emails"],
            "answer": "By listening to a podcast",
            "feedback": "He says: 'I usually listen to a podcast to make the journey more productive.'"
        },
        {
            "question": "What time does the narrator arrive at the office?",
            "options": ["8:00 AM", "8:15 AM", "8:30 AM", "9:00 AM"],
            "answer": "8:30 AM",
            "feedback": "The text explicitly says: 'I arrive at the office by 8:30 AM'."
        },
        {
            "question": "Which part of the day is usually the busiest for the narrator?",
            "options": ["The morning", "The lunch break", "The afternoon", "The evening"],
            "answer": "The morning",
             "feedback": "'My mornings are usually the busiest, filled with meetings...'"
        },
        {
            "question": "What does the narrator do during the lunch break?",
            "options": ["Works on reports", "Recharges and chats with colleagues", "Goes to the gym", "Sleeps in the car"],
            "answer": "Recharges and chats with colleagues",
             "feedback": "He takes a break 'to recharge and chat with colleagues.'"
        },
        {
            "question": "What time does the narrator usually head home?",
            "options": ["4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM"],
            "answer": "5:30 PM",
             "feedback": "He wraps up pending reports 'before heading home around 5:30 PM.'"
        },
        {
            "question": "What helps the narrator decompress after work?",
            "options": ["Checking more emails", "Exercising or cooking dinner", "Going out for drinks", "Watching the news"],
            "answer": "Exercising or cooking dinner",
             "feedback": "'Once home, I like to decompress by exercising or cooking dinner.'"
        },
        {
            "question": "What time does the narrator go to sleep to ensure 8 hours of rest?",
            "options": ["9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM"],
            "answer": "10:30 PM",
             "feedback": "'Finally, I turn in by 10:30 PM to ensure I get a solid eight hours of sleep.'"
        }
    ]

    Lesson.objects.create(
        title="QUIZ - Daily Routine",
        description="Answer 10 questions to test your comprehension of the daily routine text.",
        type="QUIZ", 
        level="B1-B2",
        order=3,
        content_json={
            "prompt": "Select the correct option for each question.",
            "questions": questions
        }
    )

    # 4. WRITING (New Section)
    Lesson.objects.create(
        title="Daily Routine - Writing",
        description="Write a short paragraph about your own daily routine.",
        type="WRITING",
        level="B1-B2",
        order=4,
        content_json={
            "prompt": "Describe your typical daily routine in 100-150 words. Include details about your morning habits, work/study schedule, and evening relaxation.",
            "min_words": 50,
            "placeholder": "Start typing your routine here..."
        }
    )

    # 5. SPEAKING
    Lesson.objects.create(
        title="Daily Routine - Speaking",
        description="Answer questions about the routine using your microphone.",
        type="SPEAKING",
        level="B1-B2",
        order=5,
        content_json={
            "questions": [
                {
                    "text": "What does the narrator do to unwind after work?",
                    "ideal_answer": "He usually hits the gym for an hour to unwind.",
                    "feedback": "Ensure you use the third person 'He' and correct verb 'hits'."
                },
                {
                    "text": "Why did the narrator regret taking the train?",
                    "ideal_answer": "Because there was a delay due to a signal failure.",
                    "feedback": "Good use of 'Because'. Try to use 'Had he known...' for bonus points."
                },
                {
                    "text": "What would you do if you were in the narrator's shoes regarding the deadline?",
                    "ideal_answer": "I would focus on finishing the report before noon.",
                    "feedback": "Excellent use of conditional 'I would'."
                }
            ]
        }
    )

    print("Seeded 'Daily Routine' module successfully!")

if __name__ == '__main__':
    seed_daily_routine()
