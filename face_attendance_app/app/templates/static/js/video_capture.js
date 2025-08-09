// video_capture.js - Modern Employee Registration with Face Capture
// Enhanced interface with circular progress and face guidance

// DOM Elements
const startButton = document.getElementById('startCapture');
const registrationForm = document.getElementById('registrationForm');
const captureInterface = document.getElementById('captureInterface');
const video = document.getElementById('video');
const statusMessage = document.getElementById('statusMessage');
const progressCircle = document.getElementById('progressCircle');
const captureStatus = document.getElementById('captureStatus');
const progressPercentage = document.getElementById('progressPercentage');
const faceGuide = document.getElementById('faceGuide');
const cancelCapture = document.getElementById('cancelCapture');
const retryCapture = document.getElementById('retryCapture');
const successModal = document.getElementById('successModal');
const closeSuccessModal = document.getElementById('closeSuccessModal');

// Form inputs
const employeeIdInput = document.getElementById('employeeId');
const nameInput = document.getElementById('name');

// State variables
let stream;
let captureTimeout;
let progressInterval;
let currentProgress = 0;
let captureData = [];
let isCapturing = false;

// Constants
const CAPTURE_DURATION = 6000; // 6 seconds
const FRAMES_PER_SECOND = 2;
const TOTAL_FRAMES = (CAPTURE_DURATION / 1000) * FRAMES_PER_SECOND;
const PROGRESS_CIRCUMFERENCE = 283;

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    startButton.addEventListener('click', startRegistration);
    cancelCapture.addEventListener('click', cancelRegistration);
    retryCapture.addEventListener('click', retryRegistration);
    closeSuccessModal.addEventListener('click', hideSuccessModal);
    
    // Click outside modal to close
    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) hideSuccessModal();
    });
}

// Start the registration process
async function startRegistration() {
    // Validate form inputs
    if (!employeeIdInput.value.trim() || !nameInput.value.trim()) {
        showStatusMessage('Please fill in all fields before starting capture', 'error');
        return;
    }
    
    try {
        // Hide form and show capture interface
        registrationForm.classList.add('hidden');
        captureInterface.classList.remove('hidden');
        
        // Start video stream
        await startVideo();
        
        // Begin capture process
        startCapture();
        
    } catch (error) {
        console.error('Registration error:', error);
        showStatusMessage('Camera access failed. Please allow camera permissions.', 'error');
        resetInterface();
    }
}

// Start video stream
async function startVideo() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 640 }
            } 
        });
        
        video.srcObject = stream;
        await video.play();
        
        // Start face detection simulation
        startFaceDetection();
        
    } catch (error) {
        throw new Error('Camera access denied or unavailable');
    }
}

// Simulate face detection (in production, use actual face detection)
function startFaceDetection() {
    setInterval(() => {
        if (!isCapturing) return;
        
        // Simulate face detection - in production, use actual face detection libraries
        const faceDetected = Math.random() > 0.2; // 80% chance of face detection
        
        if (faceDetected) {
            faceGuide.classList.add('face-guide-active');
            captureStatus.textContent = 'Face detected - capturing...';
        } else {
            faceGuide.classList.remove('face-guide-active');
            captureStatus.textContent = 'Position your face in the circle';
        }
    }, 500);
}

// Start capture process
function startCapture() {
    if (isCapturing) return;
    
    isCapturing = true;
    currentProgress = 0;
    captureData = [];
    
    captureStatus.textContent = 'Starting capture...';
    progressPercentage.textContent = '0%';
    
    // Reset progress circle
    progressCircle.style.strokeDashoffset = PROGRESS_CIRCUMFERENCE;
    
    // Start progress animation
    startProgressAnimation();
    
    // Start frame capture
    startFrameCapture();
    
    // Set timeout for completion
    captureTimeout = setTimeout(() => {
        completeCapture();
    }, CAPTURE_DURATION);
}

// Start progress animation
function startProgressAnimation() {
    const startTime = Date.now();
    
    progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / CAPTURE_DURATION, 1);
        
        currentProgress = Math.round(progress * 100);
        progressPercentage.textContent = `${currentProgress}%`;
        
        // Update progress circle
        const offset = PROGRESS_CIRCUMFERENCE - (progress * PROGRESS_CIRCUMFERENCE);
        progressCircle.style.strokeDashoffset = offset;
        
        // Update status text
        if (progress < 0.3) {
            captureStatus.textContent = 'Capturing front view...';
        } else if (progress < 0.6) {
            captureStatus.textContent = 'Turn your head slowly...';
        } else if (progress < 0.9) {
            captureStatus.textContent = 'Almost done...';
        } else {
            captureStatus.textContent = 'Processing...';
        }
        
        if (progress >= 1) {
            clearInterval(progressInterval);
        }
    }, 50);
}

// Start frame capture
function startFrameCapture() {
    const frameInterval = 1000 / FRAMES_PER_SECOND;
    let frameCount = 0;
    
    const captureFrame = () => {
        if (!isCapturing || frameCount >= TOTAL_FRAMES) return;
        
        // Create canvas to capture frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 640;
        const ctx = canvas.getContext('2d');
        
        // Draw current frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 and store
        const frameData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        captureData.push(frameData);
        
        frameCount++;
        
        // Schedule next frame
        if (frameCount < TOTAL_FRAMES) {
            setTimeout(captureFrame, frameInterval);
        }
    };
    
    // Start capturing frames
    captureFrame();
}

// Complete capture process
async function completeCapture() {
    isCapturing = false;
    clearTimeout(captureTimeout);
    clearInterval(progressInterval);
    
    captureStatus.textContent = 'Processing registration...';
    progressPercentage.textContent = '100%';
    
    try {
        // Send data to backend
        const registrationData = {
            employee_id: employeeIdInput.value.trim(),
            name: nameInput.value.trim(),
            frames: captureData
        };
        
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(registrationData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Success!
            stopVideo();
            showSuccessModal();
        } else {
            throw new Error(result.message || 'Registration failed');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showStatusMessage(`Registration failed: ${error.message}`, 'error');
        showRetryOption();
    }
}

// Cancel registration
function cancelRegistration() {
    stopCapture();
    stopVideo();
    resetInterface();
}

// Retry registration
function retryRegistration() {
    retryCapture.classList.add('hidden');
    hideStatusMessage();
    startCapture();
}

// Stop capture process
function stopCapture() {
    isCapturing = false;
    clearTimeout(captureTimeout);
    clearInterval(progressInterval);
    captureData = [];
}

// Stop video stream
function stopVideo() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        video.srcObject = null;
    }
}

// Reset interface to initial state
function resetInterface() {
    stopCapture();
    stopVideo();
    
    captureInterface.classList.add('hidden');
    registrationForm.classList.remove('hidden');
    retryCapture.classList.add('hidden');
    
    // Reset form
    employeeIdInput.value = '';
    nameInput.value = '';
    
    hideStatusMessage();
}

// Show retry option
function showRetryOption() {
    retryCapture.classList.remove('hidden');
    captureStatus.textContent = 'Registration failed';
    progressPercentage.textContent = 'Error';
}

// Show success modal
function showSuccessModal() {
    successModal.classList.remove('hidden');
}

// Hide success modal and reset
function hideSuccessModal() {
    successModal.classList.add('hidden');
    resetInterface();
}

// Show status message
function showStatusMessage(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'bg-blue-100', 'text-blue-800', 'bg-green-100', 'text-green-800');
    
    switch (type) {
        case 'error':
            statusMessage.classList.add('bg-red-100', 'text-red-800');
            break;
        case 'success':
            statusMessage.classList.add('bg-green-100', 'text-green-800');
            break;
        default:
            statusMessage.classList.add('bg-blue-100', 'text-blue-800');
    }
    
    // Auto-hide after 5 seconds for non-error messages
    if (type !== 'error') {
        setTimeout(() => {
            hideStatusMessage();
        }, 5000);
    }
}

// Hide status message
function hideStatusMessage() {
    statusMessage.classList.add('hidden');
}