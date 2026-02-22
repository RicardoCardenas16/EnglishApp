import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("STITCH_API_KEY")
URL = "https://stitch.googleapis.com/mcp"
PROJECT_ID = "8760452778674004512"

def call_mcp(method, params=None):
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
    }
    
    payload = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "id": 1,
        "params": {
            "name": method,
            "arguments": params or {}
        }
    }
    
    try:
        response = requests.post(URL, headers=headers, json=payload)
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None

print(f"--- Getting Project {PROJECT_ID} with new API Key and NO User-Project Header ---")
# Per client.ts logic, API key auth omits X-Goog-User-Project
project_response = call_mcp("get_project", {"project_id": PROJECT_ID})

if project_response:
        print(json.dumps(project_response, indent=2))
else:
        print("Failed to get project.")

print("\n--- Listing Screens (Test) ---")
screens_response = call_mcp("list_screens", {"project_id": PROJECT_ID})
if screens_response:
    print(json.dumps(screens_response, indent=2))
else:
    print("Failed to list screens.")
