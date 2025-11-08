// State management
const state = {
    isRecording: false,
    isPaused: false,
    selectedSourceId: null,
    mediaRecorder: null,
    recordedChunks: [],
    startTime: null,
    timerInterval: null,

    // Configuration
    config: {
        enableTracking: true,
        zoomLevel: 1.5,
        smoothing: true,
        frameRate: 60,
        videoQuality: 85,
        audioEnabled: false,
        showCursor: true,
        backgroundColor: '#0d0d0d',
        outputFolder: null
    },

    // Mouse tracking
    mousePosition: { x: 0, y: 0 },
    currentZoom: 1.0,
    targetZoom: 1.0,
    mouseTrackingInterval: null,

    // Video stream and rendering
    sourceStream: null,
    videoWidth: 0,
    videoHeight: 0,
    renderAnimationFrame: null
};

// DOM Elements
const elements = {
    statusMessage: document.getElementById('statusMessage'),
    sourceSelect: document.getElementById('sourceSelect'),
    refreshSources: document.getElementById('refreshSources'),
    outputFolder: document.getElementById('outputFolder'),
    browseOutput: document.getElementById('browseOutput'),

    enableTracking: document.getElementById('enableTracking'),
    zoomLevel: document.getElementById('zoomLevel'),
    zoomValue: document.getElementById('zoomValue'),
    smoothing: document.getElementById('smoothing'),

    frameRate: document.getElementById('frameRate'),
    frameRateValue: document.getElementById('frameRateValue'),
    videoQuality: document.getElementById('videoQuality'),
    qualityValue: document.getElementById('qualityValue'),
    audioEnabled: document.getElementById('audioEnabled'),

    showCursor: document.getElementById('showCursor'),
    backgroundColor: document.getElementById('backgroundColor'),
    showCanvasPreview: document.getElementById('showCanvasPreview'),
    canvasPreviewContainer: document.getElementById('canvasPreviewContainer'),

    recordingTime: document.getElementById('recordingTime'),
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resumeBtn: document.getElementById('resumeBtn'),
    stopBtn: document.getElementById('stopBtn'),

    previewVideo: document.getElementById('previewVideo'),
    previewCanvas: document.getElementById('previewCanvas')
};

// Initialize
async function init() {
    await loadSources();
    setupEventListeners();
    updateStatus('Ready to record');
}

// Load available sources
async function loadSources() {
    try {
        const sources = await window.electronAPI.getSources();
        elements.sourceSelect.innerHTML = '';

        sources.forEach(source => {
            const option = document.createElement('option');
            option.value = source.id;
            option.textContent = source.name;
            elements.sourceSelect.appendChild(option);
        });

        if (sources.length > 0) {
            state.selectedSourceId = sources[0].id;
        }
    } catch (error) {
        console.error('Failed to load sources:', error);
        updateStatus('Failed to load screens');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Source selection
    elements.sourceSelect.addEventListener('change', (e) => {
        state.selectedSourceId = e.target.value;
    });

    elements.refreshSources.addEventListener('click', loadSources);

    // Output folder
    elements.browseOutput.addEventListener('click', async () => {
        const paths = await window.electronAPI.showOpenDialog({
            properties: ['openDirectory']
        });

        if (paths && paths.length > 0) {
            state.config.outputFolder = paths[0];
            elements.outputFolder.value = paths[0];
        }
    });

    // Configuration
    elements.enableTracking.addEventListener('change', (e) => {
        state.config.enableTracking = e.target.checked;
    });

    elements.zoomLevel.addEventListener('input', (e) => {
        state.config.zoomLevel = parseFloat(e.target.value);
        elements.zoomValue.textContent = `${state.config.zoomLevel.toFixed(1)}x`;
    });

    elements.smoothing.addEventListener('change', (e) => {
        state.config.smoothing = e.target.checked;
    });

    elements.frameRate.addEventListener('input', (e) => {
        state.config.frameRate = parseInt(e.target.value);
        elements.frameRateValue.textContent = `${state.config.frameRate} FPS`;
    });

    elements.videoQuality.addEventListener('input', (e) => {
        state.config.videoQuality = parseInt(e.target.value);
        elements.qualityValue.textContent = state.config.videoQuality;
    });

    elements.audioEnabled.addEventListener('change', (e) => {
        state.config.audioEnabled = e.target.checked;
    });

    elements.showCursor.addEventListener('change', (e) => {
        state.config.showCursor = e.target.checked;
    });

    elements.backgroundColor.addEventListener('change', (e) => {
        state.config.backgroundColor = e.target.value;
    });

    elements.showCanvasPreview.addEventListener('change', (e) => {
        if (e.target.checked) {
            elements.canvasPreviewContainer.style.display = 'block';
        } else {
            elements.canvasPreviewContainer.style.display = 'none';
        }
    });

    // Recording controls
    elements.startBtn.addEventListener('click', startRecording);
    elements.pauseBtn.addEventListener('click', pauseRecording);
    elements.resumeBtn.addEventListener('click', resumeRecording);
    elements.stopBtn.addEventListener('click', stopRecording);
}

// Start recording
async function startRecording() {
    if (!state.selectedSourceId) {
        updateStatus('Please select a screen to record');
        return;
    }

    try {
        console.log('[RECORDING] Starting recording...');
        console.log('[RECORDING] Config:', state.config);

        // Get the stream for the selected source
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: state.config.audioEnabled ? {
                mandatory: {
                    chromeMediaSource: 'desktop'
                }
            } : false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: state.selectedSourceId,
                    minWidth: 1280,
                    maxWidth: 3840,
                    minHeight: 720,
                    maxHeight: 2160,
                    frameRate: { ideal: state.config.frameRate, max: state.config.frameRate }
                }
            }
        });

        console.log('[RECORDING] Got media stream:', stream);
        console.log('[RECORDING] Video tracks:', stream.getVideoTracks());

        // Set up video preview
        elements.previewVideo.srcObject = stream;
        elements.previewVideo.play();

        // Wait for video metadata to load
        await new Promise((resolve) => {
            elements.previewVideo.onloadedmetadata = resolve;
        });

        console.log('[RECORDING] Video metadata loaded');

        // Set up canvas for recording with effects
        const canvas = elements.previewCanvas;
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();

        canvas.width = settings.width || 1920;
        canvas.height = settings.height || 1080;

        console.log('[RECORDING] Canvas size:', canvas.width, 'x', canvas.height);

        // Store original stream and video dimensions
        state.sourceStream = stream;
        state.videoWidth = canvas.width;
        state.videoHeight = canvas.height;

        // Get canvas stream (this will include the zoom effects)
        let recordingStream;
        if (state.config.enableTracking) {
            console.log('[RECORDING] Using canvas stream with tracking enabled');

            // Start rendering loop FIRST to ensure canvas has content
            startCanvasRendering();
            console.log('[RECORDING] Canvas rendering started');

            // Wait a bit for the first frame to be drawn
            await new Promise(resolve => setTimeout(resolve, 100));

            // Record from canvas with effects
            const canvasStream = canvas.captureStream(state.config.frameRate);
            console.log('[RECORDING] Canvas stream created');
            console.log('[RECORDING] Canvas stream tracks:', canvasStream.getTracks());

            // Add audio track if enabled
            if (state.config.audioEnabled) {
                const audioTracks = stream.getAudioTracks();
                audioTracks.forEach(track => canvasStream.addTrack(track));
                console.log('[RECORDING] Added audio tracks:', audioTracks.length);
            }

            recordingStream = canvasStream;
        } else {
            console.log('[RECORDING] Using direct stream (no tracking)');
            // Record directly without effects
            recordingStream = stream;
        }

        console.log('[RECORDING] Recording stream tracks:', recordingStream.getTracks());

        // Configure MediaRecorder
        const options = {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: calculateBitrate(state.config.videoQuality)
        };

        console.log('[RECORDING] MediaRecorder options:', options);

        state.mediaRecorder = new MediaRecorder(recordingStream, options);
        state.recordedChunks = [];

        state.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                console.log('[RECORDING] Data chunk received:', e.data.size, 'bytes');
                state.recordedChunks.push(e.data);
            }
        };

        state.mediaRecorder.onerror = (e) => {
            console.error('[RECORDING] MediaRecorder error:', e);
        };

        state.mediaRecorder.onstart = () => {
            console.log('[RECORDING] MediaRecorder started');
            console.log('[RECORDING] MediaRecorder state:', state.mediaRecorder.state);
        };

        state.mediaRecorder.onstop = () => {
            console.log('[RECORDING] MediaRecorder stopped event');
            handleRecordingStop();
        };

        // Start recording
        state.mediaRecorder.start(100); // Collect data every 100ms
        state.isRecording = true;
        state.startTime = Date.now();

        console.log('[RECORDING] MediaRecorder.start() called');
        console.log('[RECORDING] MediaRecorder state:', state.mediaRecorder.state);

        // Start mouse tracking if enabled
        if (state.config.enableTracking) {
            startMouseTracking();
            console.log('[RECORDING] Mouse tracking started');
        }

        // Start timer
        startTimer();

        // Update UI
        updateUIForRecording();
        updateStatus('Recording...');

    } catch (error) {
        console.error('[RECORDING] Failed to start recording:', error);
        updateStatus(`Error: ${error.message}`);
    }
}

// Pause recording
function pauseRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
        state.mediaRecorder.pause();
        state.isPaused = true;
        stopTimer();

        elements.pauseBtn.style.display = 'none';
        elements.resumeBtn.style.display = 'inline-block';
        updateStatus('Paused');
    }
}

// Resume recording
function resumeRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state === 'paused') {
        state.mediaRecorder.resume();
        state.isPaused = false;
        startTimer();

        elements.resumeBtn.style.display = 'none';
        elements.pauseBtn.style.display = 'inline-block';
        updateStatus('Recording...');
    }
}

// Stop recording
async function stopRecording() {
    if (state.mediaRecorder) {
        console.log('[RECORDING] Stopping recording...');
        console.log('[RECORDING] Total chunks collected:', state.recordedChunks.length);

        state.mediaRecorder.stop();
        stopMouseTracking();
        stopCanvasRendering();
        stopTimer();

        // Stop all tracks
        if (state.sourceStream) {
            state.sourceStream.getTracks().forEach(track => track.stop());
        }

        updateStatus('Processing video...');
    }
}

// Handle recording stop
async function handleRecordingStop() {
    console.log('[RECORDING] handleRecordingStop called');
    console.log('[RECORDING] Chunks to process:', state.recordedChunks.length);

    try {
        const blob = new Blob(state.recordedChunks, {
            type: 'video/webm'
        });

        console.log('[RECORDING] Blob created, size:', blob.size, 'bytes');

        // Get save path
        const savePath = await window.electronAPI.showSaveDialog();

        if (savePath) {
            console.log('[RECORDING] Save path selected:', savePath);
            updateStatus('Saving recording...');

            // Convert blob to buffer and save
            const buffer = await blob.arrayBuffer();
            console.log('[RECORDING] Buffer size:', buffer.byteLength, 'bytes');

            // Save file through main process
            const result = await window.electronAPI.saveRecording(savePath, buffer);

            if (result.success) {
                console.log('[RECORDING] File saved successfully');
                updateStatus(`Recording saved: ${savePath}`);
            } else {
                console.error('[RECORDING] Failed to save file:', result.error);
                updateStatus(`Failed to save: ${result.error}`);
            }
        } else {
            console.log('[RECORDING] Save cancelled by user');
            updateStatus('Recording cancelled');
        }
    } catch (error) {
        console.error('[RECORDING] Failed to save recording:', error);
        updateStatus(`Error: ${error.message}`);
    } finally {
        console.log('[RECORDING] Cleanup and reset state');
        // Reset state
        state.isRecording = false;
        state.isPaused = false;
        state.recordedChunks = [];
        updateUIForIdle();
    }
}

// Canvas rendering with zoom effects
function startCanvasRendering() {
    const canvas = elements.previewCanvas;
    const ctx = canvas.getContext('2d');
    const video = elements.previewVideo;

    console.log('[CANVAS] Starting canvas rendering');
    console.log('[CANVAS] Canvas dimensions:', canvas.width, 'x', canvas.height);
    console.log('[CANVAS] Video element ready state:', video.readyState);
    console.log('[CANVAS] Video element paused:', video.paused);
    console.log('[CANVAS] Video dimensions:', video.videoWidth, 'x', video.videoHeight);

    let frameCount = 0;

    function render() {
        if (!state.isRecording) {
            console.log('[CANVAS] Stopped rendering (not recording)');
            return;
        }

        frameCount++;
        if (frameCount === 1) {
            console.log('[CANVAS] First frame rendered');
            console.log('[CANVAS] Video readyState:', video.readyState);
            console.log('[CANVAS] Video dimensions:', video.videoWidth, 'x', video.videoHeight);
        }
        if (frameCount % 60 === 0) {
            console.log('[CANVAS] Rendered', frameCount, 'frames');
        }

        // Clear canvas
        ctx.fillStyle = state.config.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Check if video is ready
        if (video.readyState < 2) {
            console.warn('[CANVAS] Video not ready yet, skipping frame');
            state.renderAnimationFrame = requestAnimationFrame(render);
            return;
        }

        // Draw video with zoom effect
        try {
            if (state.config.enableTracking && state.currentZoom > 1.0) {
                // Calculate the zoomed region centered on mouse position
                const zoomWidth = state.videoWidth / state.currentZoom;
                const zoomHeight = state.videoHeight / state.currentZoom;

                // Get mouse position relative to video dimensions
                // Clamp to ensure we don't go out of bounds
                const mouseX = Math.max(zoomWidth / 2, Math.min(state.videoWidth - zoomWidth / 2, state.mousePosition.x));
                const mouseY = Math.max(zoomHeight / 2, Math.min(state.videoHeight - zoomHeight / 2, state.mousePosition.y));

                // Calculate source rectangle (the part we're zooming into)
                const sx = mouseX - zoomWidth / 2;
                const sy = mouseY - zoomHeight / 2;

                if (frameCount === 1) {
                    console.log('[CANVAS] Drawing zoomed video - sx:', sx, 'sy:', sy, 'zoom:', state.currentZoom);
                }

                // Draw the zoomed portion
                ctx.drawImage(
                    video,
                    sx, sy, zoomWidth, zoomHeight,  // Source rectangle
                    0, 0, canvas.width, canvas.height  // Destination rectangle
                );

                // Draw cursor if enabled
                if (state.config.showCursor) {
                    const cursorX = (canvas.width / 2);
                    const cursorY = (canvas.height / 2);
                    drawCursor(ctx, cursorX, cursorY);
                }
            } else {
                if (frameCount === 1) {
                    console.log('[CANVAS] Drawing full video (no zoom)');
                }

                // No zoom, draw entire video
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Draw cursor if enabled
                if (state.config.showCursor) {
                    const cursorX = (state.mousePosition.x / state.videoWidth) * canvas.width;
                    const cursorY = (state.mousePosition.y / state.videoHeight) * canvas.height;
                    drawCursor(ctx, cursorX, cursorY);
                }
            }

            if (frameCount === 1) {
                console.log('[CANVAS] First frame drawn successfully');
            }
        } catch (error) {
            console.error('[CANVAS] Error drawing frame:', error);
        }

        state.renderAnimationFrame = requestAnimationFrame(render);
    }

    render();
}

function stopCanvasRendering() {
    if (state.renderAnimationFrame) {
        cancelAnimationFrame(state.renderAnimationFrame);
        state.renderAnimationFrame = null;
    }
}

function drawCursor(ctx, x, y) {
    const size = 20;
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw crosshair
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.stroke();
}

// Mouse tracking
function startMouseTracking() {
    console.log('[MOUSE] Starting mouse tracking');
    let updateCount = 0;

    state.mouseTrackingInterval = setInterval(async () => {
        const position = await window.electronAPI.getMousePosition();
        state.mousePosition = position;

        updateCount++;
        if (updateCount % 60 === 0) {
            console.log('[MOUSE] Position update #', updateCount, ':', position);
        }

        // Update target zoom based on mouse movement
        if (state.config.enableTracking) {
            state.targetZoom = state.config.zoomLevel;
        } else {
            state.targetZoom = 1.0;
        }

        // Smooth zoom transition
        if (state.config.smoothing) {
            const smoothing = 0.1;
            state.currentZoom += (state.targetZoom - state.currentZoom) * smoothing;
        } else {
            state.currentZoom = state.targetZoom;
        }

    }, 16); // ~60 FPS
}

function stopMouseTracking() {
    if (state.mouseTrackingInterval) {
        clearInterval(state.mouseTrackingInterval);
        state.mouseTrackingInterval = null;
    }
}

// Timer
function startTimer() {
    state.timerInterval = setInterval(() => {
        const elapsed = Date.now() - state.startTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        elements.recordingTime.textContent =
            `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

// UI Updates
function updateUIForRecording() {
    elements.startBtn.style.display = 'none';
    elements.pauseBtn.style.display = 'inline-block';
    elements.stopBtn.style.display = 'inline-block';

    // Disable configuration changes during recording
    elements.sourceSelect.disabled = true;
    elements.enableTracking.disabled = true;
    elements.zoomLevel.disabled = true;
    elements.frameRate.disabled = true;
}

function updateUIForIdle() {
    elements.startBtn.style.display = 'inline-block';
    elements.pauseBtn.style.display = 'none';
    elements.resumeBtn.style.display = 'none';
    elements.stopBtn.style.display = 'none';
    elements.recordingTime.textContent = '00:00';

    // Re-enable configuration
    elements.sourceSelect.disabled = false;
    elements.enableTracking.disabled = false;
    elements.zoomLevel.disabled = false;
    elements.frameRate.disabled = false;
}

function updateStatus(message) {
    elements.statusMessage.textContent = message;
}

// Utility functions
function calculateBitrate(quality) {
    // Convert quality (50-100) to bitrate (2.5-10 Mbps)
    const minBitrate = 2500000; // 2.5 Mbps
    const maxBitrate = 10000000; // 10 Mbps
    const range = maxBitrate - minBitrate;
    const normalized = (quality - 50) / 50; // 0-1
    return minBitrate + (range * normalized);
}

// Start the app
init();
