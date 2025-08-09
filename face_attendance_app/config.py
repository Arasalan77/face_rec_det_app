# Smart Attendance System Configuration
# Modify these settings to customize the application behavior

# Face Recognition Settings
RECOGNITION_THRESHOLD = 0.6  # Similarity threshold for face matching (0.0 - 1.0)
MIN_FACE_SIZE = 100         # Minimum face size in pixels for detection
MAX_FACE_SIZE = 800         # Maximum face size for processing optimization

# Video Capture Settings
CAPTURE_DURATION = 6000     # Registration capture duration in milliseconds
FRAMES_PER_SECOND = 2       # Frame capture rate during registration
VIDEO_WIDTH = 640           # Preferred video width
VIDEO_HEIGHT = 640          # Preferred video height

# Database Settings
DATABASE_URL = "sqlite:///./attendance.db"  # Database connection string
DATABASE_ECHO = False       # Set to True for SQL query logging

# API Settings
API_TITLE = "Smart Attendance System"
API_DESCRIPTION = "Modern face recognition attendance system"
API_VERSION = "1.0.0"
CORS_ORIGINS = ["*"]        # Allowed CORS origins (use specific domains in production)

# Security Settings
SECRET_KEY = "your-secret-key-change-in-production"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# UI Settings
APP_NAME = "Smart Attendance"
COMPANY_NAME = "Your Company"
PRIMARY_COLOR = "#3B82F6"   # Primary brand color
SUCCESS_COLOR = "#10B981"   # Success state color
ERROR_COLOR = "#EF4444"     # Error state color

# PWA Settings
PWA_NAME = "Smart Attendance System"
PWA_SHORT_NAME = "SmartAttendance"
PWA_DESCRIPTION = "Modern face recognition based attendance system"
PWA_THEME_COLOR = "#3B82F6"
PWA_BACKGROUND_COLOR = "#F8FAFC"

# Performance Settings
ENABLE_GZIP = True          # Enable gzip compression
STATIC_FILES_CACHE_MAX_AGE = 3600  # Cache duration for static files (seconds)

# Logging Settings
LOG_LEVEL = "INFO"          # Logging level: DEBUG, INFO, WARNING, ERROR
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# Development Settings
DEBUG_MODE = True           # Enable debug features
AUTO_RELOAD = True          # Auto-reload on code changes
SHOW_DOCS = True           # Show API documentation at /docs
