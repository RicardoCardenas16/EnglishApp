import google.generativeai as genai
import os
from dotenv import load_dotenv
from pathlib import Path
import time

# Setup environment
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / 'API.env')

api_key = os.getenv('GEMINI_API_KEY')
print(f"API Key present: {'Yes' if api_key else 'No'}")
if api_key:
    print(f"API Key start: {api_key[:5]}...")

if not api_key:
    print("CRITICAL: No API Key found.")
    exit(1)

genai.configure(api_key=api_key)

# Models to test
models = [
    'gemini-2.0-flash-lite', 
    'gemini-1.5-flash', 
    'gemini-pro', 
    'gemini-1.5-pro'
]

print("\n--- Starting Model Connection Test ---\n")

for model_name in models:
    print(f"Testing model: {model_name}")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Hello, can you hear me?")
        print(f"SUCCESS: {model_name}")
        print(f"Response snippet: {response.text[:50]}...")
        # If one works, we are good, but let's test all to see options
    except Exception as e:
        print(f"FAILED: {model_name}")
        print(f"Error: {e}")
        # Check specific error types
        error_str = str(e).lower()
        if "404" in error_str:
            print("-> Model not found (404)")
        elif "429" in error_str or "quota" in error_str:
            print("-> Rate limit / Quota exceeded")
    print("-" * 30)
    time.sleep(1) # Be nice to rate limits

print("\n--- Test Complete ---")
