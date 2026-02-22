import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("STITCH_API_KEY")
PROJECT_ID = "8760452778674004512"
URL_MCP = "https://stitch.googleapis.com/mcp"

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

print("--- Inspecting Response Structure ---")
resp = call_mcp("list_screens", {"project_id": PROJECT_ID})

if resp:
    print("Top level keys:", resp.keys())
    if "result" in resp:
        print("Result keys:", resp["result"].keys())
        if "content" in resp["result"]:
            print("Content type:", type(resp["result"]["content"]))
            if isinstance(resp["result"]["content"], list) and len(resp["result"]["content"]) > 0:
                 print("Content[0] keys:", resp["result"]["content"][0].keys())
                 if "text" in resp["result"]["content"][0]:
                     text_sample = resp["result"]["content"][0]["text"][:100]
                     print(f"Text sample: {text_sample}...")
    
        if "screens" in resp["result"]:
             print("Found 'screens' directly in result!")
