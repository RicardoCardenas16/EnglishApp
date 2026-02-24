import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv('API.env')
api_key = os.getenv('GEMINI_API_KEY')
print(f"Key loaded: {api_key[:10]}...")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-flash-latest')

try:
    print("Sending request...")
    response = model.generate_content("Say 'YES' if you work.")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
