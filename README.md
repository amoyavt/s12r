# Screen Recorder

A minimal, expandable desktop screen recording application for Windows with auto mouse pointer tracking and zoom capabilities. Inspired by Cursorful and Screen Studio.

## Features

- **Screen Recording**: Capture any screen/monitor
- **Mouse Tracking**: Automatic mouse pointer tracking with smooth zoom
- **Configurable Zoom**: Adjustable zoom level (1.0x - 3.0x)
- **High Quality**: 30/60/120 FPS recording with quality settings
- **Custom Backgrounds**: Default background or custom image support
- **Browser Frame Removal**: Option to remove browser chrome when recording
- **Sleek UI**: Modern, minimal black interface

## Tech Stack

- **.NET 8** - Modern, cross-platform framework
- **WPF** - Windows Presentation Foundation for UI
- **MVVM Pattern** - Model-View-ViewModel architecture
- **CommunityToolkit.Mvvm** - Modern MVVM helpers
- **FFmpeg** - Video encoding (to be implemented)
- **SharpDX** - DirectX screen capture (to be implemented)
- **Windows.Graphics.Capture** - Modern Windows screen capture API

## Project Structure

```
ScreenRecorder/
├── Models/                      # Data models
│   ├── RecordingConfiguration.cs
│   ├── RecordingState.cs
│   └── ScreenInfo.cs
├── ViewModels/                  # MVVM ViewModels
│   └── MainViewModel.cs
├── Views/                       # XAML UI
│   ├── MainWindow.xaml
│   └── MainWindow.xaml.cs
├── Services/                    # Business logic services
│   ├── IScreenCaptureService.cs
│   ├── ScreenCaptureService.cs
│   ├── IMouseTrackingService.cs
│   ├── MouseTrackingService.cs
│   ├── IVideoRecordingService.cs
│   └── VideoRecordingService.cs
├── Utils/                       # Utility classes
│   ├── RecordingStateToVisibilityConverter.cs
│   └── InverseBooleanConverter.cs
└── App.xaml                     # Application resources & theme
```

## Architecture

### MVVM Pattern

The application follows the MVVM (Model-View-ViewModel) pattern for clean separation of concerns:

- **Models**: Pure data classes with no business logic
- **Views**: XAML-based UI with minimal code-behind
- **ViewModels**: Presentation logic, data binding, and command handling
- **Services**: Reusable business logic components

### Service Layer

Services are designed as interfaces with implementations, making them:
- **Testable**: Easy to mock for unit tests
- **Replaceable**: Swap implementations without changing ViewModels
- **Extensible**: Add new features by implementing interfaces

### Key Services

1. **IScreenCaptureService**
   - Captures screen content at specified FPS
   - Supports multiple monitors
   - Raises events with frame data

2. **IMouseTrackingService**
   - Tracks mouse position using Win32 API
   - Polls at 60 FPS for smooth tracking
   - Raises events on position changes

3. **IVideoRecordingService**
   - Manages recording lifecycle (start/stop/pause/resume)
   - Collects frames for encoding
   - Handles video export with FFmpeg

## Setup & Running

### Prerequisites

- **Visual Studio 2022** (any edition)
- **.NET 8 SDK** - [Download here](https://dotnet.microsoft.com/download/dotnet/8.0)
- **Windows 10/11** (required for WPF and screen capture APIs)

### Opening in Visual Studio 2022

1. Open Visual Studio 2022
2. File → Open → Project/Solution
3. Navigate to `ScreenRecorder.sln`
4. Click Open

### Building

1. Right-click the solution in Solution Explorer
2. Select "Restore NuGet Packages"
3. Press `Ctrl+Shift+B` or Build → Build Solution

### Running

1. Press `F5` to run with debugging
2. Or `Ctrl+F5` to run without debugging

## Configuration Options

The UI provides the following configuration options:

- **Screen to Record**: Select which monitor to capture
- **Output Folder**: Choose where recordings are saved
- **Enable Auto-Tracking**: Toggle mouse tracking on/off
- **Zoom Level**: Adjust zoom intensity (1.0x - 3.0x)
- **Frame Rate**: Select 30, 60, or 120 FPS
- **Video Quality**: Adjust quality (50-100)
- **Remove Browser Frame**: Strip browser UI when recording

## Expanding the Application

### Adding Screen Capture Implementation

The current `ScreenCaptureService.cs` has placeholder implementation. To add real screen capture:

1. **Option A: Windows.Graphics.Capture (Recommended)**
   ```csharp
   // Add NuGet: Microsoft.Windows.SDK.Contracts
   using Windows.Graphics.Capture;
   using Windows.Graphics.DirectX.Direct3D11;
   ```

2. **Option B: SharpDX (Already referenced)**
   ```csharp
   // Capture using DXGI Desktop Duplication
   using SharpDX.DXGI;
   using SharpDX.Direct3D11;
   ```

**Implementation location**: `Services/ScreenCaptureService.cs` → `CaptureLoop()` method

### Adding FFmpeg Video Encoding

The `VideoRecordingService.cs` needs FFmpeg integration:

1. **Download FFmpeg binaries**:
   - Get from [ffmpeg.org](https://ffmpeg.org/download.html)
   - Place `ffmpeg.exe` in project output folder

2. **Implement encoding**:
   ```csharp
   // In StopRecordingAsync()
   // Pipe frames to FFmpeg process
   // Use FFmpeg.AutoGen or System.Diagnostics.Process
   ```

3. **Example FFmpeg command**:
   ```bash
   ffmpeg -f rawvideo -pix_fmt bgra -s 1920x1080 -r 60 -i - -c:v libx264 -preset fast -crf 23 output.mp4
   ```

**Implementation location**: `Services/VideoRecordingService.cs` → `StopRecordingAsync()` method

### Adding Mouse Zoom Effect

To implement smooth mouse tracking with zoom:

1. **In ScreenCaptureService**:
   - Subscribe to `MouseTrackingService.MousePositionChanged`
   - Calculate zoom region around mouse position
   - Apply transform to captured frame

2. **Smooth Animation**:
   - Use interpolation for smooth zoom transitions
   - Consider easing functions (ease-in-out)

3. **Example logic**:
   ```csharp
   var zoomWidth = frameWidth / Configuration.ZoomLevel;
   var zoomHeight = frameHeight / Configuration.ZoomLevel;
   var zoomX = mouseX - (zoomWidth / 2);
   var zoomY = mouseY - (zoomHeight / 2);
   // Crop and scale frame
   ```

### Adding Background Replacement

To implement custom backgrounds:

1. **Load background image/color**
2. **Composite layers**:
   - Bottom layer: Background
   - Middle layer: Captured screen (possibly with transparency)
   - Top layer: Mouse cursor (if needed)

3. **Implementation options**:
   - Use ImageSharp for image manipulation
   - Use DirectX for GPU-accelerated compositing

### Adding New Configuration Options

To add new settings:

1. **Add property to `RecordingConfiguration.cs`**:
   ```csharp
   public bool ShowMouseCursor { get; set; } = true;
   ```

2. **Add UI control in `MainWindow.xaml`**:
   ```xaml
   <CheckBox IsChecked="{Binding Configuration.ShowMouseCursor}"/>
   ```

3. **Use in services**:
   ```csharp
   if (_config.ShowMouseCursor) {
       // Draw cursor
   }
   ```

## Design Patterns Used

### Repository Pattern (Services)
Services act as repositories for different concerns (capture, tracking, recording).

### Command Pattern (MVVM Commands)
User actions are encapsulated as commands using `RelayCommand` from CommunityToolkit.Mvvm.

### Observer Pattern (Events)
Services raise events that ViewModels subscribe to for decoupled communication.

### Factory Pattern (Potential)
Could be added for creating different capture/encoding strategies.

## Creating Installer

### Option 1: ClickOnce Deployment
1. Right-click project → Publish
2. Follow wizard to create installer

### Option 2: WiX Toolset
1. Install WiX Toolset
2. Add WiX installer project to solution
3. Configure product details and build

### Option 3: Advanced Installer
1. Use Advanced Installer (commercial)
2. Import Visual Studio project
3. Build MSI/EXE installer

## Performance Considerations

- **Frame Capture**: Use GPU-accelerated capture (DXGI or Windows.Graphics.Capture)
- **Encoding**: Offload to background thread or GPU encoder
- **Mouse Polling**: 60 FPS is sufficient for smooth tracking
- **Memory Management**: Dispose captured frames promptly

## Testing

The architecture supports testing:

```csharp
// Example unit test
var mockCaptureService = new Mock<IScreenCaptureService>();
var viewModel = new MainViewModel(mockCaptureService.Object, ...);
```

## Contributing

This is designed to be a minimal starting point. Areas for improvement:

- [ ] Implement actual screen capture using Windows.Graphics.Capture
- [ ] Add FFmpeg video encoding
- [ ] Implement mouse zoom effect
- [ ] Add background replacement
- [ ] Add audio recording
- [ ] Add editing features (trim, cut)
- [ ] Add hotkey support
- [ ] Add system tray integration
- [ ] Add preset configurations
- [ ] Add export to different formats

## License

MIT License - feel free to use and modify for your needs.

## Resources

- [WPF Documentation](https://docs.microsoft.com/en-us/dotnet/desktop/wpf/)
- [MVVM Toolkit](https://learn.microsoft.com/en-us/dotnet/communitytoolkit/mvvm/)
- [Windows.Graphics.Capture](https://docs.microsoft.com/en-us/uwp/api/windows.graphics.capture)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [SharpDX](http://sharpdx.org/)

## Support

For issues or questions, please open an issue on the repository.
