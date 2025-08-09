#!/usr/bin/env python3
"""
Quick Demo Launcher for Smart Attendance System
This script provides a simple way to test the application without complex setup
"""

import subprocess
import sys
import webbrowser
import time
from pathlib import Path

def check_requirements():
    """Check if basic requirements are met"""
    try:
        import fastapi
        import uvicorn
        print("✅ FastAPI and Uvicorn are available")
        return True
    except ImportError:
        print("❌ Missing requirements. Please install:")
        print("   pip install fastapi uvicorn")
        return False

def start_server():
    """Start the FastAPI development server"""
    app_path = Path(__file__).parent / "app" / "main.py"
    if not app_path.exists():
        print("❌ Cannot find app/main.py")
        return False
    
    print("🚀 Starting Smart Attendance System...")
    print("📱 Admin Panel will open at: http://localhost:8000/admin.html")
    print("👤 Registration page at: http://localhost:8000/index.html")
    print("\nPress Ctrl+C to stop the server")
    print("=" * 50)
    
    try:
        # Start uvicorn server
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "app.main:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\n👋 Server stopped. Thank you for using Smart Attendance!")
        return True
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return False

def main():
    """Main demo launcher function"""
    print("🎯 Smart Attendance System - Quick Demo")
    print("=" * 50)
    
    if not check_requirements():
        sys.exit(1)
    
    # Wait a moment and open browser
    def open_browser():
        time.sleep(2)
        try:
            webbrowser.open("http://localhost:8000/admin.html")
        except:
            pass
    
    import threading
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    start_server()

if __name__ == "__main__":
    main()
