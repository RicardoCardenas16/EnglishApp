import os
import requests
import json
import re
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("STITCH_API_KEY")
PROJECT_ID = "8760452778674004512"
URL_MCP = "https://stitch.googleapis.com/mcp"
ASSETS_DIR = Path("design_assets")

ASSETS_DIR.mkdir(exist_ok=True)

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
        response = requests.post(URL_MCP, headers=headers, json=payload)
        return response.json()
    except Exception as e:
        print(f"Error calling MCP: {e}")
        return None

def download_file(url, filename):
    print(f"Attempting to download {filename} from {url[:50]}...")
    try:
        # Try with API Key header? unlikely to work for usercontent but harmless
        headers = {} 
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            filepath = ASSETS_DIR / filename
            with open(filepath, "wb") as f:
                f.write(response.content)
            print(f"SUCCESS: Downloaded {filename}")
            return filepath
        else:
            print(f"FAILED: Status {response.status_code} for {filename}")
            return None
    except Exception as e:
        print(f"ERROR downloading {filename}: {e}")
        return None

def normalize_filename(title):
    clean = re.sub(r'[\\/*?:"<>|]', "", title)
    clean = clean.replace(" ", "_").lower()
    # limit length
    return clean[:50]

print("--- Fetching Screens ---")
resp = call_mcp("list_screens", {"project_id": PROJECT_ID})

screens = []
if resp and "result" in resp:
    result = resp["result"]
    
    # Try structured content first
    if "structuredContent" in result and "screens" in result["structuredContent"]:
        print("Using structuredContent")
        screens = result["structuredContent"]["screens"]
    elif "content" in result:
        # Parse text content
        for content in result["content"]:
            if content.get("type") == "text":
                try:
                    data = json.loads(content["text"])
                    if "screens" in data:
                        print("Using parsed text content")
                        screens = data["screens"]
                        break
                except:
                    pass

if not screens:
    print("Could not find screens in response.")
    exit(1)

print(f"Found {len(screens)} screens. Filtering...")

target_keywords = ["dashboard", "iniciar", "registro", "onboarding", "ruta"]

for screen in screens:
    title = screen.get("title", "Unknown")
    print(f"Checking: {title}")
    
    # Simple keyword match
    if any(k in title.lower() for k in target_keywords):
        print(f"MATCH: {title}")
        safe_title = normalize_filename(title)
        
        # Download Screenshot
        if "screenshot" in screen and "downloadUrl" in screen["screenshot"]:
            download_file(screen["screenshot"]["downloadUrl"], f"{safe_title}.png")
            
        # Download HTML
        if "htmlCode" in screen and "downloadUrl" in screen["htmlCode"]:
            download_file(screen["htmlCode"]["downloadUrl"], f"{safe_title}.html")
