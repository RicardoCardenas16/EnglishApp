import google.generativeai as genai
import os
from dotenv import load_dotenv
from pathlib import Path
import time

# Setup environment
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / 'API.env')

api_key = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=api_key)

print("\n--- Testing Available Models from List ---\n")

# These were explicitly listed in check_models.py output
models = [
    'gemini-pro-latest', 
    'gemini-flash-latest',
    'gemini-2.0-flash-lite-001' # Specific version might bypass generic quota?
]

for model_name in models:
    print(f"Testing model: {model_name}")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Hello")
        # If we get here, it worked!
        print(f"SUCCESS: {model_name}")
        print(f"Response: {response.text}")
        break 
    except Exception as e:
        print(f"FAILED: {model_name}")
        print(f"Error: {e}")
    print("-" * 30)
    time.sleep(2)
