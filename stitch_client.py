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
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        print(f"Response: {response.text}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

print("--- Discovering Tools ---")
# MCP standard method to list tools is 'tools/list'
tools_response = call_mcp("tools/list")
if tools_response:
    print(json.dumps(tools_response, indent=2))

print("\n--- Listing Projects (Test) ---")
# 'list_projects' was seen in the TypeScript code
projects_response = call_mcp("tools/call", {
    "name": "list_projects",
    "arguments": {}
})

if projects_response:
    print(json.dumps(projects_response, indent=2))
