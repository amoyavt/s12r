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
    targetZoom: 1.0
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

        // Set up video preview
        elements.previewVideo.srcObject = stream;
        elements.previewVideo.play();

        // Configure MediaRecorder
        const options = {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: calculateBitrate(state.config.videoQuality)
        };

        state.mediaRecorder = new MediaRecorder(stream, options);
        state.recordedChunks = [];

        state.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                state.recordedChunks.push(e.data);
            }
        };

        state.mediaRecorder.onstop = handleRecordingStop;

        // Start recording
        state.mediaRecorder.start(100); // Collect data every 100ms
        state.isRecording = true;
        state.startTime = Date.now();

        // Start mouse tracking if enabled
        if (state.config.enableTracking) {
            startMouseTracking();
        }

        // Start timer
        startTimer();

        // Update UI
        updateUIForRecording();
        updateStatus('Recording...');

    } catch (error) {
        console.error('Failed to start recording:', error);
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
        state.mediaRecorder.stop();
        stopMouseTracking();
        stopTimer();

        // Stop all tracks
        const stream = elements.previewVideo.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        updateStatus('Processing video...');
    }
}

// Handle recording stop
async function handleRecordingStop() {
    try {
        const blob = new Blob(state.recordedChunks, {
            type: 'video/webm'
        });

        // Get save path
        const savePath = await window.electronAPI.showSaveDialog();

        if (savePath) {
            updateStatus('Saving recording...');

            // Convert blob to buffer and save
            const buffer = await blob.arrayBuffer();

            // Save file through main process
            const result = await window.electronAPI.saveRecording(savePath, buffer);

            if (result.success) {
                updateStatus(`Recording saved: ${savePath}`);
            } else {
                updateStatus(`Failed to save: ${result.error}`);
            }
        } else {
            updateStatus('Recording cancelled');
        }
    } catch (error) {
        console.error('Failed to save recording:', error);
        updateStatus(`Error: ${error.message}`);
    } finally {
        // Reset state
        state.isRecording = false;
        state.isPaused = false;
        state.recordedChunks = [];
        updateUIForIdle();
    }
}

// Mouse tracking
function startMouseTracking() {
    state.mouseTrackingInterval = setInterval(async () => {
        const position = await window.electronAPI.getMousePosition();
        state.mousePosition = position;

        // Update target zoom based on mouse movement
        if (state.config.enableTracking) {
            state.targetZoom = state.config.zoomLevel;
        }

        // Smooth zoom transition
        if (state.config.smoothing) {
            const smoothing = 0.1;
            state.currentZoom += (state.targetZoom - state.currentZoom) * smoothing;
        } else {
            state.currentZoom = state.targetZoom;
        }

        // Apply zoom effect to canvas (if implemented)
        // This would involve drawing the video frame to canvas with zoom applied

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
