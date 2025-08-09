// checkin.js
// Periodically captures a frame from the webcam and sends it to the backend
// for recognition.  Displays recognition results and attendance status.

const video = document.getElementById('video');
const resultsDiv = document.getElementById('results');
let checkStream;

async function initCamera() {
    try {
        checkStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = checkStream;
        await video.play();
    } catch (err) {
        resultsDiv.textContent = 'Camera access denied or unavailable.';
        throw err;
    }
}

function captureFrame() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return dataUrl.split(',')[1];
}

async function recogniseFrame() {
    try {
        if (!video.srcObject) return;
        const frame = captureFrame();
        const res = await fetch('/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frame: frame }),
        });
        const data = await res.json();
        if (res.ok && data.employee_id) {
            const sim = data.similarity !== undefined ? data.similarity.toFixed(2) : '';
            resultsDiv.textContent = `${data.name} ${data.status} (similarity=${sim})`;
        } else {
            resultsDiv.textContent = data.message;
        }
    } catch (err) {
        console.error(err);
        resultsDiv.textContent = 'Recognition error.';
    }
}

// Initialise camera once the page is loaded
window.addEventListener('load', async () => {
    await initCamera();
    // Start sending frames every few seconds
    setInterval(recogniseFrame, 3000);
});