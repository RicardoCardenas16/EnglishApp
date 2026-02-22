import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("STITCH_API_KEY")
URL = "https://stitch.googleapis.com/mcp"

def call_mcp(method, params=None):
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY
    }
    
    payload = {
        "jsonrpc": "2.0",
        "method": method,
        "id": 1,
        "params": params or {}
    }
    
    try:
        response = requests.post(URL, headers=headers, json=payload)
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None

print("--- Tool Names ---")
response = call_mcp("tools/list")
if response and "result" in response and "tools" in response["result"]:
    for tool in response["result"]["tools"]:
        print(f"- {tool['name']}")
else:
    print("Could not list tools or structure unexpected.")
    print(json.dumps(response, indent=2))
