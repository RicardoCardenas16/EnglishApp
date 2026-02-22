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
        response.raise_for_status()
        filepath = ASSETS_DIR / filename
        with open(filepath, "wb") as f:
            f.write(response.content)
        print(f"Downloaded: {filename}")
        return filepath
    except Exception as e:
        print(f"Error downloading {filename}: {e}")
        return None

def normalize_filename(title):
    # Remove invalid chars and spaces
    clean = re.sub(r'[\\/*?:"<>|]', "", title)
    clean = clean.replace(" ", "_").lower()
    return clean

print("--- Fetching Screens ---")
screens_response = call_mcp("list_screens", {"project_id": PROJECT_ID})

if screens_response and "result" in screens_response and "content" in screens_response["result"]:
    content_block = screens_response["result"]["content"][0]
    if content_block["type"] == "text":
        try:
             # Sometimes the content is a JSON string inside the text block
            data = json.loads(content_block["text"])
            screens = data
        except:
             # Or it might be directly in the response structure if the MCP client parsed it differently
             # But looking at previous output, the tool returns the list directly in the result (if success)
             # Let's rely on the previous output structure.
             pass

    # Actually, the previous output showed the result directly in the 'result' key of the JSON-RPC response
    # wait, the previous output showed:
    # "result": { "content": [ { "type": "text", "text": "..." } ] } -> Error case
    # "result": { "content": [ { "type": "text", "text": JSON_STRING } ] } -> Success case usually returns text
    # BUT, the previous success output showed structured data!
    # "result": { "screens": [ ... ] } ??? 
    # Let's look closely at the previous successful output.
    # It was: "result": { "screens": [ ... ] } inside the JSON RPC response?
    # No, the previous output was `print(json.dumps(screens_response, indent=2))`
    # And it showed:
    # { "id": 1, "result": { "screens": [ ... ] } }
    
    if "screens" in screens_response["result"]:
        screens = screens_response["result"]["screens"]
        
        # Filter for "Dashboard Principal" and "Iniciar Sesión"
        target_titles = ["Dashboard Principal (Ruta de Aprendizaje)", "Iniciar Sesión / Registro", "Onboarding de Bienvenida"]
        
        for screen in screens:
            title = screen.get("title", "Unknown")
            print(f"Found screen: {title}")
            
            # Download matched screens
            # using partial match
            if any(t in title for t in ["Dashboard", "Iniciar Sesión", "Onboarding"]):
                safe_title = normalize_filename(title)
                
                # Download HTML
                if "htmlCode" in screen and "downloadUrl" in screen["htmlCode"]:
                    html_url = screen["htmlCode"]["downloadUrl"]
                    download_file(html_url, f"{safe_title}.html")
                
                # Download Screenshot (Reference)
                if "screenshot" in screen and "downloadUrl" in screen["screenshot"]:
                    img_url = screen["screenshot"]["downloadUrl"]
                    download_file(img_url, f"{safe_title}.png")

    else:
        print("No 'screens' field in result.")
        print(screens_response)
else:
    print("Failed to get valid response.")
