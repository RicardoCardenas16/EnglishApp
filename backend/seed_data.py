import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Lesson

def seed_lessons():
    # Clear existing lessons to avoid duplicates
    Lesson.objects.all().delete()
    print("Deleted existing lessons.")

    lessons_data = [
        {
            "title": "Hola y Adiós",
            "description": "Saludos formales e informales en diferentes contextos.",
            "type": "READING",
            "level": "A1",
            "order": 1,
            "content_json": {
                "blocks": [
                    {"type": "text", "content": "Hello! My name is John."},
                    {"type": "question", "question": "What is his name?", "options": ["John", "Paul", "George"], "answer": "John"}
                ]
            }
        },
        {
            "title": "Presentaciones",
            "description": "Aprende a presentarte a ti mismo y a otros.",
            "type": "SPEAKING",
            "level": "A1",
            "order": 2,
            "content_json": {
                "phrase": "Nice to meet you.",
                "phonetic": "/naɪs tu miːt juː/"
            }
        },
        {
            "title": "Objetos de Clase",
            "description": "Vocabulario esencial de objetos escolares.",
            "type": "LISTENING",
            "level": "A1",
            "order": 3,
            "content_json": {
                "audio_url": "http://example.com/audio/pencil.mp3",
                "word": "Pencil"
            }
        },
        {
            "title": "Escribir una nota",
            "description": "Cómo escribir mensajes cortos y correos básicos.",
            "type": "WRITING",
            "level": "A1",
            "order": 4,
            "content_json": {
                "prompt": "Write a short note to your friend inviting them to lunch."
            }
        },
        {
            "title": "Verbo To Be",
            "description": "La base de la gramática inglesa: Ser o Estar.",
            "type": "GRAMMAR",
            "level": "A1",
            "order": 5,
            "content_json": {}
        },
        {
            "title": "Colores y Números",
            "description": "Vocabulario básico para describir el mundo.",
            "type": "VOCABULARY",
            "level": "A1",
            "order": 6,
            "content_json": {}
        }
    ]

    for lesson_data in lessons_data:
        Lesson.objects.create(**lesson_data)
        print(f"Created lesson: {lesson_data['title']}")

if __name__ == '__main__':
    seed_lessons()
    print("Database seeded successfully!")
