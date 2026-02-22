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

print("\n--- Testing Classic Models ---\n")

# gemini-pro is the most stable free tier usually
models = ['gemini-pro', 'gemini-1.0-pro']

for model_name in models:
    print(f"Testing model: {model_name}")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Hello")
        print(f"SUCCESS: {model_name}")
        print(f"Response: {response.text}")
        break # Output success and stop
    except Exception as e:
        print(f"FAILED: {model_name}")
        error_str = str(e)
        if "404" in error_str:
            print("Status: 404 Not Found")
        elif "429" in error_str:
            print("Status: 429 Rate Limit")
        else:
            print(f"Error: {e}")
    print("-" * 30)
