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
    try:
        response = requests.get(url)
        if response.status_code == 200:
            filepath = ASSETS_DIR / filename
            with open(filepath, "wb") as f:
                f.write(response.content)
            print(f"SUCCESS: Downloaded {filename}")
            return filepath
    except Exception as e:
        print(f"ERROR downloading {filename}: {e}")
        return None

def normalize_filename(title):
    clean = re.sub(r'[\\/*?:"<>|]', "", title)
    clean = clean.replace(" ", "_").lower()
    return clean[:50]

print("--- Fetching Exercise Screen ---")
resp = call_mcp("list_screens", {"project_id": PROJECT_ID})

if resp and "result" in resp:
    result = resp["result"]
    screens = result.get("structuredContent", {}).get("screens", [])
    
    # If structuredContent empty, try parsing text
    if not screens and "content" in result:
        for c in result["content"]:
            if c.get("type") == "text":
                try:
                    data = json.loads(c["text"])
                    if "screens" in data:
                        screens = data["screens"]
                        break
                except: pass

    # Find the Reading exercise
    target = "Ejercicio de Reading y Comprensión"
    for screen in screens:
        title = screen.get("title", "")
        if target in title:
            print(f"Found: {title}")
            safe_title = normalize_filename(title)
            if "htmlCode" in screen:
                download_file(screen["htmlCode"]["downloadUrl"], f"{safe_title}.html")
            if "screenshot" in screen:
                download_file(screen["screenshot"]["downloadUrl"], f"{safe_title}.png")
            break
