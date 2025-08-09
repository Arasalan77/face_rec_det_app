#!/bin/bash

# Smart Attendance Development Script
# This script helps you quickly start the development server

echo "🎯 Smart Attendance System - Development Setup"
echo "=============================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "app/main.py" ]; then
    echo "❌ Please run this script from the face_attendance_app directory"
    exit 1
fi

echo "✅ Python found: $(python3 --version)"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies. Please check the error messages above."
    exit 1
fi

# Start the development server
echo ""
echo "🚀 Starting Smart Attendance System..."
echo "📱 Admin Panel: http://localhost:8000/admin.html"
echo "👤 Registration: http://localhost:8000/index.html"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=============================================="

# Start uvicorn with reload for development
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
