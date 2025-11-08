# Screen Recorder

A minimal, cross-platform desktop screen recorder with auto mouse pointer tracking and zoom capabilities. Built with Electron for Windows, macOS, and Linux.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)

Inspired by Cursorful and Screen Studio, this app provides a clean, expandable foundation for building professional screen recording software.

## Features

- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Screen Recording**: Capture any screen, window, or application
- **Mouse Tracking**: Real-time mouse position tracking with smooth zoom
- **Configurable Zoom**: Adjustable zoom level (1.0x - 3.0x) with smooth transitions
- **High Quality**: Up to 120 FPS recording with adjustable bitrate
- **Audio Support**: Optional system audio recording
- **Custom Settings**: Frame rate, video quality, background color
- **Sleek UI**: Modern, minimal black interface
- **Minimal & Expandable**: Clean codebase, easy to extend

## Screenshots

```
┌─────────────────────────────────────────────────────┐
│  Screen Recorder                                    │
│  Ready to record                                    │
├─────────────────────────────────────────────────────┤
│  Recording                                          │
│  Screen/Window: [Display 1 ▼] [Refresh]           │
│  Output Folder: [/path/to/folder] [Browse]        │
│                                                      │
│  Mouse Tracking                                     │
│  ☑ Enable Auto-Tracking                            │
│  Zoom Level: ────●──── 1.5x                        │
│  ☑ Smooth Zoom Transitions                         │
│                                                      │
│  Video Settings                                     │
│  Frame Rate: ─────●─── 60 FPS                      │
│  Video Quality: ────●── 85                         │
│  ☐ Record System Audio                             │
│                                                      │
│  Advanced                                           │
│  ☑ Show Mouse Cursor                               │
│  Background Color: [#0d0d0d]                       │
├─────────────────────────────────────────────────────┤
│  00:00                    [Start Recording] [Stop]  │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- **Node.js 18+** (with npm)
- **Git**

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd s12r

# Install dependencies
npm install

# Run the app
npm start
```

### Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Build for specific platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Project Structure

```
s12r/
├── src/
│   ├── main.js              # Electron main process
│   ├── preload.js           # Secure IPC bridge
│   └── renderer/
│       ├── index.html       # Main UI
│       ├── styles.css       # Sleek black styling
│       └── renderer.js      # UI logic & recording
├── assets/
│   └── icon.png             # App icon
├── package.json             # Dependencies & scripts
└── README.md
```

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Electron Main Process              │
│  - Window management                                │
│  - IPC handlers                                     │
│  - Screen/source enumeration                        │
└────────────┬────────────────────────────────────────┘
             │ IPC (contextBridge)
┌────────────▼────────────────────────────────────────┐
│              Renderer Process (UI)                  │
│  - Configuration UI                                 │
│  - MediaRecorder API for capture                    │
│  - Mouse tracking                                   │
│  - Video processing                                 │
└─────────────────────────────────────────────────────┘
```

### Key Technologies

- **Electron**: Cross-platform desktop framework
- **MediaRecorder API**: Native browser video recording
- **desktopCapturer**: Electron API for screen/window capture
- **Canvas API**: Video frame processing (for zoom effects)
- **IPC (Inter-Process Communication)**: Secure main ↔ renderer communication

## Configuration Options

### Recording
- **Screen/Window Selection**: Choose what to capture
- **Output Folder**: Where to save recordings

### Mouse Tracking
- **Enable Auto-Tracking**: Toggle mouse tracking on/off
- **Zoom Level**: 1.0x (no zoom) to 3.0x (3x magnification)
- **Smooth Transitions**: Interpolate zoom for smooth animation

### Video Settings
- **Frame Rate**: 30, 60, or 120 FPS
- **Video Quality**: 50-100 (affects bitrate: 2.5-10 Mbps)
- **System Audio**: Record audio along with video

### Advanced
- **Show Cursor**: Include cursor in recording
- **Background Color**: Custom background (for future compositing)

## Expanding the App

### Adding Canvas-Based Zoom Effect

Currently, zoom tracking is implemented but not applied to the video. To add real-time zoom:

**1. Create a processing pipeline:**

```javascript
// In renderer.js, add this function
function processVideoFrame() {
    const ctx = elements.previewCanvas.getContext('2d');
    const video = elements.previewVideo;

    // Set canvas size
    elements.previewCanvas.width = video.videoWidth;
    elements.previewCanvas.height = video.videoHeight;

    function draw() {
        if (!state.isRecording) return;

        // Calculate zoom region around mouse
        const zoomWidth = video.videoWidth / state.currentZoom;
        const zoomHeight = video.videoHeight / state.currentZoom;
        const zoomX = state.mousePosition.x - zoomWidth / 2;
        const zoomY = state.mousePosition.y - zoomHeight / 2;

        // Draw zoomed section
        ctx.drawImage(
            video,
            zoomX, zoomY, zoomWidth, zoomHeight,  // Source
            0, 0, video.videoWidth, video.videoHeight  // Destination
        );

        requestAnimationFrame(draw);
    }

    draw();

    // Return canvas stream instead of video stream
    return elements.previewCanvas.captureStream(state.config.frameRate);
}
```

**2. Modify startRecording():**

```javascript
// After getting the stream, process it through canvas
const processedStream = processVideoFrame();
state.mediaRecorder = new MediaRecorder(processedStream, options);
```

### Adding Background Replacement

**1. Load background image:**

```javascript
const backgroundImage = new Image();
backgroundImage.src = 'path/to/background.png';
```

**2. Composite in draw loop:**

```javascript
// Draw background first
ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

// Draw video on top
ctx.globalCompositeOperation = 'source-over';
ctx.drawImage(video, ...);
```

### Adding Window Frame Detection

Use Electron's window APIs to detect browser windows and crop:

```javascript
// In main.js
const { BrowserWindow } = require('electron');

ipcMain.handle('get-window-bounds', async (event, windowId) => {
    const win = BrowserWindow.fromId(windowId);
    if (win) {
        const bounds = win.getBounds();
        const contentBounds = win.getContentBounds();

        return {
            frame: {
                top: contentBounds.y - bounds.y,
                left: contentBounds.x - bounds.x,
                right: bounds.width - contentBounds.width,
                bottom: bounds.height - contentBounds.height
            }
        };
    }
});
```

### Adding More Features

**Ideas for expansion:**
- [ ] Webcam overlay
- [ ] Annotations and drawings
- [ ] Trim/edit after recording
- [ ] Multiple output formats (MP4, GIF)
- [ ] Cloud upload integration
- [ ] Hotkey support
- [ ] System tray integration
- [ ] Scheduled recordings
- [ ] Multiple simultaneous recordings

## Building Executables

### Windows (.exe)

```bash
npm run build:win
```

Output: `dist/Screen Recorder Setup.exe`

### macOS (.dmg)

```bash
npm run build:mac
```

Output: `dist/Screen Recorder.dmg`

### Linux (.AppImage, .deb)

```bash
npm run build:linux
```

Output: `dist/Screen Recorder.AppImage` and `.deb`

## Development Tips

### Enable DevTools

Set environment variable:
```bash
NODE_ENV=development npm start
```

### Debugging Main Process

Add to VSCode `launch.json`:
```json
{
    "type": "node",
    "request": "launch",
    "name": "Electron Main",
    "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
    "program": "${workspaceFolder}/src/main.js",
    "protocol": "inspector"
}
```

### Hot Reload

Install `electron-reloader`:
```bash
npm install --save-dev electron-reloader
```

Add to `main.js`:
```javascript
try {
    require('electron-reloader')(module);
} catch {}
```

## Troubleshooting

### Screen capture not working

- **Linux**: May need additional permissions. Run with `--no-sandbox`:
  ```bash
  npm run dev
  ```

- **macOS**: Grant screen recording permission in System Preferences → Security & Privacy → Screen Recording

### Audio not recording

- System audio capture has limited support. Consider using external libraries like `node-audio-capture` for better compatibility.

### Video quality issues

- Increase `videoQuality` slider
- Adjust `frameRate` (lower = smaller file, higher = smoother)
- Check available disk space

## Performance Optimization

### For High FPS Recording

1. **Reduce resolution**: Capture at native resolution, not scaled
2. **Hardware acceleration**: Enable in Electron (enabled by default)
3. **Limit background processes**: Close other apps during recording
4. **Use SSD**: Save recordings to SSD for faster write speeds

### For Smooth Zoom

1. **Adjust smoothing factor**: In `renderer.js`, modify:
   ```javascript
   const smoothing = 0.1; // Lower = smoother but slower response
   ```

2. **Optimize canvas operations**: Use `OffscreenCanvas` for better performance:
   ```javascript
   const offscreen = new OffscreenCanvas(width, height);
   ```

## Contributing

Contributions are welcome! This project is designed to be minimal and expandable.

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test on your platform
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- Use ES6+ features
- Follow existing code structure
- Comment complex logic
- Keep functions focused and small

## Security

This app uses `contextIsolation` and `nodeIntegration: false` for security. All Node.js APIs are exposed through a secure preload script.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Electron Builder](https://www.electron.build/)

## Acknowledgments

Inspired by:
- [Cursorful](https://cursorful.com/)
- [Screen Studio](https://www.screen.studio/)

## Support

If you encounter issues or have questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Search existing [Issues](../../issues)
3. Open a new issue with details about your environment and problem

---

Built with ❤️ using Electron
