"""
Simple script to test the CORS configuration of the backend.
Run this script while the backend is running to check if CORS is working correctly.
"""
import requests

def test_cors(base_url="https://syncer-hwgu.onrender.com"):
    """Test CORS configuration by sending requests to various endpoints."""
    endpoints = [
        "/",
        "/api/cors_test",
        "/api/youtube_quota_usage",
        "/api/testing"
    ]
    
    # Headers that simulate a request from localhost:5173
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Content-Type"
    }
    
    for endpoint in endpoints:
        url = f"{base_url}{endpoint}"
        
        # Test preflight OPTIONS request
        try:
            options_response = requests.options(url, headers=headers)
            cors_allowed = "Access-Control-Allow-Origin" in options_response.headers
            print(f"OPTIONS {url} - Status: {options_response.status_code}, CORS Headers Present: {cors_allowed}")
            if cors_allowed:
                print(f"  Allow-Origin: {options_response.headers.get('Access-Control-Allow-Origin')}")
                print(f"  Allow-Methods: {options_response.headers.get('Access-Control-Allow-Methods')}")
        except Exception as e:
            print(f"OPTIONS {url} - Error: {str(e)}")
            
        # Test actual GET request
        try:
            get_response = requests.get(url, headers={"Origin": "http://localhost:5173"})
            cors_allowed = "Access-Control-Allow-Origin" in get_response.headers
            print(f"GET {url} - Status: {get_response.status_code}, CORS Headers Present: {cors_allowed}")
            if cors_allowed:
                print(f"  Allow-Origin: {get_response.headers.get('Access-Control-Allow-Origin')}")
            if get_response.status_code == 200:
                print(f"  Response: {get_response.json()}")
            print()
        except Exception as e:
            print(f"GET {url} - Error: {str(e)}\n")

if __name__ == "__main__":
    # Test the deployed backend
    test_cors()
    
    # Also test the local backend
    test_cors("http://localhost:8000")
