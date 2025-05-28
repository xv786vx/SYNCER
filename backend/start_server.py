"""
Startup script for the Syncer backend with enhanced CORS support.
"""
import os
import uvicorn
import argparse

def main():
    parser = argparse.ArgumentParser(description="Start the Syncer backend server")
    parser.add_argument(
        "--port", 
        type=int, 
        default=8000, 
        help="Port to run the server on (default: 8000)"
    )
    parser.add_argument(
        "--host", 
        type=str, 
        default="127.0.0.1", 
        help="Host to run the server on (default: 127.0.0.1)"
    )
    parser.add_argument(
        "--reload", 
        action="store_true", 
        help="Enable auto-reload on file changes"
    )
    parser.add_argument(
        "--cors-dev", 
        action="store_true", 
        help="Enable more permissive CORS for development"
    )
    
    args = parser.parse_args()
    
    # Set development environment variables
    if args.cors_dev:
        os.environ["CORS_DEV_MODE"] = "true"
        print("⚠️ Running with development CORS settings (more permissive) ⚠️")
    
    print(f"🚀 Starting Syncer backend on http://{args.host}:{args.port}")
    
    # Run the server
    uvicorn.run(
        "server:app",
        host=args.host,
        port=args.port,
        reload=args.reload
    )

if __name__ == "__main__":
    main()
