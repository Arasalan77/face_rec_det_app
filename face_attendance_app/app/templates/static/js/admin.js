// admin.js - Modern Face Attendance System
// Production-grade mobile-first admin panel with advanced face detection

// DOM Elements
const tabEmployees = document.getElementById('tabEmployees');
const tabCheckin = document.getElementById('tabCheckin');
const tabLogs = document.getElementById('tabLogs');

// Panels
const employeesPanel = document.getElementById('employeesPanel');
const checkinPanel = document.getElementById('checkinPanel');
const logsPanel = document.getElementById('logsPanel');

// Employee elements
const employeeList = document.getElementById('employeeList');
const employeeCount = document.getElementById('employeeCount');
const addEmployeeButton = document.getElementById('addEmployeeButton');

// Check-in/out elements
const startCheckinBtn = document.getElementById('startCheckin');
const stopCheckinBtn = document.getElementById('stopCheckin');
const checkinVideo = document.getElementById('checkinVideo');
const checkinMessage = document.getElementById('checkinMessage');
const startCameraOverlay = document.getElementById('startCameraOverlay');
const faceDetectionCircle = document.getElementById('faceDetectionCircle');
const scanLine = document.getElementById('scanLine');

// Logs elements
const logsContainer = document.getElementById('logsContainer');
const refreshLogs = document.getElementById('refreshLogs');
const dateFilter = document.getElementById('dateFilter');

// Success modal
const successModal = document.getElementById('successModal');
const successTitle = document.getElementById('successTitle');
const successMessage = document.getElementById('successMessage');
const closeSuccessModal = document.getElementById('closeSuccessModal');

// Current time display
const currentTime = document.getElementById('currentTime');

// State variables
let checkinStream;
let checkinInterval;
let faceDetectionInterval;
let isRecognizing = false;
let lastRecognitionTime = 0;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Set today's date as default filter
    dateFilter.valueAsDate = new Date();
    
    // Event listeners
    setupEventListeners();
    
    // Show employees tab by default
    showTab('employees');
}

function setupEventListeners() {
    // Tab navigation
    tabEmployees.addEventListener('click', () => showTab('employees'));
    tabCheckin.addEventListener('click', () => showTab('checkin'));
    tabLogs.addEventListener('click', () => showTab('logs'));
    
    // Camera controls
    startCheckinBtn.addEventListener('click', startCamera);
    stopCheckinBtn.addEventListener('click', stopCamera);
    
    // Employee registration
    addEmployeeButton.addEventListener('click', () => {
        window.location.href = '/index.html';
    });
    
    // Logs controls
    refreshLogs.addEventListener('click', loadLogs);
    dateFilter.addEventListener('change', loadLogs);
    
    // Success modal
    closeSuccessModal.addEventListener('click', hideSuccessModal);
    
    // Click outside modal to close
    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) hideSuccessModal();
    });
}

function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    currentTime.textContent = timeString;
}

// Show the selected tab and hide others
function showTab(tab) {
    // Stop camera when leaving checkin tab
    if (checkinStream && tab !== 'checkin') {
        stopCamera();
    }
    
    // Update panel visibility
    employeesPanel.classList.add('hidden');
    checkinPanel.classList.add('hidden');
    logsPanel.classList.add('hidden');
    
    // Reset tab styles
    [tabEmployees, tabCheckin, tabLogs].forEach(tabBtn => {
        tabBtn.classList.remove('text-blue-600');
        tabBtn.classList.add('text-gray-500');
    });
    
    if (tab === 'employees') {
        employeesPanel.classList.remove('hidden');
        tabEmployees.classList.add('text-blue-600');
        tabEmployees.classList.remove('text-gray-500');
        loadEmployees();
    } else if (tab === 'checkin') {
        checkinPanel.classList.remove('hidden');
        tabCheckin.classList.add('text-blue-600');
        tabCheckin.classList.remove('text-gray-500');
    } else if (tab === 'logs') {
        logsPanel.classList.remove('hidden');
        tabLogs.classList.add('text-blue-600');
        tabLogs.classList.remove('text-gray-500');
        loadLogs();
    }
}

// Fetch and display employees with modern card design
async function loadEmployees() {
    employeeList.innerHTML = `
        <div class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    `;
    
    try {
        const res = await fetch('/employees');
        const data = await res.json();
        
        employeeList.innerHTML = '';
        employeeCount.textContent = `${data.length} employee${data.length !== 1 ? 's' : ''}`;
        
        if (data.length === 0) {
            employeeList.innerHTML = `
                <div class="text-center py-12">
                    <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                    </svg>
                    <p class="text-gray-500 text-lg">No employees registered</p>
                    <p class="text-gray-400 text-sm mt-1">Add your first employee to get started</p>
                </div>
            `;
            return;
        }
        
        data.forEach((emp, index) => {
            const employeeCard = document.createElement('div');
            employeeCard.className = 'bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow fade-in';
            employeeCard.style.animationDelay = `${index * 100}ms`;
            employeeCard.innerHTML = `
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        ${emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-900">${emp.name}</h3>
                        <p class="text-sm text-gray-500">ID: ${emp.employee_id}</p>
                    </div>
                    <div class="text-right">
                        <div class="w-3 h-3 bg-green-400 rounded-full"></div>
                        <p class="text-xs text-gray-400 mt-1">Active</p>
                    </div>
                </div>
            `;
            employeeList.appendChild(employeeCard);
        });
    } catch (err) {
        console.error('Error loading employees:', err);
        employeeList.innerHTML = `
            <div class="text-center py-8">
                <svg class="w-12 h-12 text-red-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <p class="text-red-500 font-medium">Failed to load employees</p>
                <p class="text-gray-400 text-sm mt-1">Please check your connection and try again</p>
            </div>
        `;
    }
}

// Start camera for check-in/out with modern interface
async function startCamera() {
    try {
        startCheckinBtn.disabled = true;
        showCheckinMessage('Starting camera...', 'info');
        
        checkinStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        checkinVideo.srcObject = checkinStream;
        await checkinVideo.play();
        
        // Hide start overlay and show stop button
        startCameraOverlay.classList.add('hidden');
        stopCheckinBtn.classList.remove('hidden');
        
        // Start face detection and recognition
        startFaceDetection();
        startRecognition();
        
        showCheckinMessage('Camera ready! Position your face in the circle', 'success');
        
        // Hide message after 3 seconds
        setTimeout(() => {
            hideCheckinMessage();
        }, 3000);
        
    } catch (err) {
        console.error('Camera error:', err);
        showCheckinMessage('Camera access denied or unavailable', 'error');
        startCheckinBtn.disabled = false;
        stopCamera();
    }
}

// Stop camera and cleanup
function stopCamera() {
    if (checkinStream) {
        checkinStream.getTracks().forEach(track => track.stop());
        checkinStream = null;
        checkinVideo.srcObject = null;
    }
    
    if (checkinInterval) {
        clearInterval(checkinInterval);
        checkinInterval = null;
    }
    
    if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
        faceDetectionInterval = null;
    }
    
    // Reset UI
    startCameraOverlay.classList.remove('hidden');
    stopCheckinBtn.classList.add('hidden');
    faceDetectionCircle.classList.add('hidden');
    scanLine.classList.add('hidden');
    hideCheckinMessage();
    
    startCheckinBtn.disabled = false;
    isRecognizing = false;
}

// Face detection circle animation
function startFaceDetection() {
    faceDetectionCircle.classList.remove('hidden');
    scanLine.classList.remove('hidden');
    
    // Simulate face detection (in production, this would use actual face detection)
    faceDetectionInterval = setInterval(() => {
        // Random position for demo (in production, this would be actual face coordinates)
        const videoRect = checkinVideo.getBoundingClientRect();
        const centerX = videoRect.width / 2;
        const centerY = videoRect.height / 2;
        const radius = Math.min(videoRect.width, videoRect.height) * 0.3;
        
        // Position the face detection circle
        faceDetectionCircle.style.width = `${radius * 2}px`;
        faceDetectionCircle.style.height = `${radius * 2}px`;
        faceDetectionCircle.style.left = `${centerX - radius}px`;
        faceDetectionCircle.style.top = `${centerY - radius}px`;
        
        // Simulate face detection state
        if (Math.random() > 0.3) {
            faceDetectionCircle.classList.add('face-detection-active');
        } else {
            faceDetectionCircle.classList.remove('face-detection-active');
        }
    }, 500);
}

// Start recognition process
function startRecognition() {
    if (checkinInterval) return;
    
    checkinInterval = setInterval(async () => {
        if (!checkinVideo.srcObject || isRecognizing) return;
        
        // Prevent multiple simultaneous recognition attempts
        const now = Date.now();
        if (now - lastRecognitionTime < 2000) return;
        
        lastRecognitionTime = now;
        await recognizeFrame();
    }, 3000);
}

// Capture and recognize frame
async function recognizeFrame() {
    if (!checkinVideo.srcObject || isRecognizing) return;
    
    isRecognizing = true;
    
    try {
        // Create canvas to capture frame
        const canvas = document.createElement('canvas');
        canvas.width = checkinVideo.videoWidth || 640;
        canvas.height = checkinVideo.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(checkinVideo, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const frameData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        // Send to backend
        const res = await fetch('/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frame: frameData }),
        });
        
        const data = await res.json();
        
        if (res.ok && data.employee_id) {
            // Success! Show success modal and stop camera
            showSuccessModal(data.name, data.status);
            stopCamera();
        } else if (data.message && !data.message.includes('No face')) {
            // Only show error messages, not "no face detected"
            showCheckinMessage(data.message, 'error');
        }
        
    } catch (err) {
        console.error('Recognition error:', err);
        showCheckinMessage('Recognition failed. Please try again.', 'error');
    } finally {
        isRecognizing = false;
    }
}

// Show success modal
function showSuccessModal(employeeName, status) {
    const action = status.toLowerCase().includes('in') ? 'checked in' : 'checked out';
    const actionColor = status.toLowerCase().includes('in') ? 'text-green-600' : 'text-blue-600';
    
    successTitle.textContent = `Welcome, ${employeeName}!`;
    successMessage.innerHTML = `You have successfully <span class="${actionColor} font-semibold">${action}</span> at ${new Date().toLocaleTimeString()}`;
    
    successModal.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideSuccessModal();
    }, 5000);
}

// Hide success modal
function hideSuccessModal() {
    successModal.classList.add('hidden');
}

// Show check-in message with modern styling
function showCheckinMessage(msg, type) {
    if (!checkinMessage) return;
    
    checkinMessage.textContent = msg;
    checkinMessage.classList.remove('hidden', 'bg-green-600', 'bg-red-600', 'bg-blue-600', 'bg-gray-800');
    
    switch (type) {
        case 'success':
            checkinMessage.classList.add('bg-green-600');
            break;
        case 'error':
            checkinMessage.classList.add('bg-red-600');
            break;
        case 'info':
            checkinMessage.classList.add('bg-blue-600');
            break;
        default:
            checkinMessage.classList.add('bg-gray-800');
    }
    
    // Auto-hide after 3 seconds for non-error messages
    if (type !== 'error') {
        setTimeout(() => {
            hideCheckinMessage();
        }, 3000);
    }
}

// Hide check-in message
function hideCheckinMessage() {
    if (checkinMessage) {
        checkinMessage.classList.add('hidden');
    }
}

// Load attendance logs with modern card design
async function loadLogs() {
    logsContainer.innerHTML = `
        <div class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    `;
    
    try {
        const selectedDate = dateFilter.value;
        const url = selectedDate ? `/attendance_logs?date=${selectedDate}` : '/attendance_logs';
        
        const res = await fetch(url);
        const data = await res.json();
        
        logsContainer.innerHTML = '';
        
        if (data.length === 0) {
            logsContainer.innerHTML = `
                <div class="text-center py-12">
                    <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p class="text-gray-500 text-lg">No attendance records</p>
                    <p class="text-gray-400 text-sm mt-1">Records will appear here after check-ins</p>
                </div>
            `;
            return;
        }
        
        data.forEach((log, index) => {
            const logCard = document.createElement('div');
            logCard.className = 'bg-white rounded-xl p-4 shadow-sm border border-gray-100 fade-in';
            logCard.style.animationDelay = `${index * 50}ms`;
            
            const timestamp = new Date(log.timestamp);
            const timeString = timestamp.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
            const dateString = timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            const isCheckIn = log.status.toLowerCase().includes('in');
            const statusColor = isCheckIn ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
            const statusIcon = isCheckIn ? 
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>' :
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>';
            
            logCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-semibold">
                            ${(log.name || 'Unknown').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-900">${log.name || 'Unknown Employee'}</h3>
                            <p class="text-sm text-gray-500">ID: ${log.employee_id}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="flex items-center space-x-2 mb-1">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">
                                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    ${statusIcon}
                                </svg>
                                ${log.status}
                            </span>
                        </div>
                        <p class="text-sm text-gray-600 font-medium">${timeString}</p>
                        <p class="text-xs text-gray-400">${dateString}</p>
                    </div>
                </div>
            `;
            
            logsContainer.appendChild(logCard);
        });
        
    } catch (err) {
        console.error('Error loading logs:', err);
        logsContainer.innerHTML = `
            <div class="text-center py-8">
                <svg class="w-12 h-12 text-red-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <p class="text-red-500 font-medium">Failed to load attendance logs</p>
                <p class="text-gray-400 text-sm mt-1">Please check your connection and try again</p>
            </div>
        `;
    }
}