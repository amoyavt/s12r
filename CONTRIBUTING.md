# Contributing to Screen Recorder

Thank you for your interest in expanding this project! This guide will help you understand how to implement the core features that are currently placeholders.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Open `ScreenRecorder.sln` in Visual Studio 2022
4. Restore NuGet packages
5. Build the solution

## Architecture Overview

The project uses a clean MVVM architecture:

```
UI (View) → ViewModel → Services → Platform APIs
```

All business logic belongs in Services, making them reusable and testable.

## Implementation Roadmap

### Priority 1: Screen Capture (High Priority)

**File**: `Services/ScreenCaptureService.cs`
**Method**: `CaptureLoop()`

#### Recommended Approach: Windows.Graphics.Capture API

1. **Add NuGet Package**:
   ```
   Microsoft.Windows.SDK.Contracts
   ```

2. **Implementation Steps**:

```csharp
using Windows.Graphics.Capture;
using Windows.Graphics.DirectX.Direct3D11;
using SharpDX.Direct3D11;

private void CaptureLoop(CancellationToken cancellationToken)
{
    // 1. Get the screen to capture
    var screens = Screen.AllScreens;
    var targetScreen = screens[_screenIndex];

    // 2. Create Direct3D device
    var d3dDevice = new SharpDX.Direct3D11.Device(
        SharpDX.Direct3D.DriverType.Hardware,
        DeviceCreationFlags.BgraSupport
    );

    // 3. Create Graphics Capture item for the screen
    var item = CreateCaptureItemForMonitor(targetScreen);

    // 4. Create frame pool
    var framePool = Direct3D11CaptureFramePool.Create(
        device,
        DirectXPixelFormat.B8G8R8A8UIntNormalized,
        2,
        item.Size
    );

    // 5. Create capture session
    var session = framePool.CreateCaptureSession(item);

    // 6. Handle frame arrived events
    framePool.FrameArrived += (sender, args) =>
    {
        using var frame = framePool.TryGetNextFrame();
        if (frame != null)
        {
            // Convert frame to byte array
            byte[] frameData = ConvertFrameToBytes(frame);
            FrameCaptured?.Invoke(this, frameData);
        }
    };

    // 7. Start capture
    session.StartCapture();

    // 8. Wait for cancellation
    cancellationToken.WaitHandle.WaitOne();

    // 9. Cleanup
    session?.Dispose();
    framePool?.Dispose();
}
```

#### Alternative: DXGI Desktop Duplication

If Windows.Graphics.Capture doesn't work:

```csharp
using SharpDX.DXGI;
using SharpDX.Direct3D11;

private void CaptureWithDXGI(CancellationToken cancellationToken)
{
    // Get adapter and output
    var factory = new Factory1();
    var adapter = factory.GetAdapter1(0);
    var output = adapter.GetOutput(_screenIndex);
    var output1 = output.QueryInterface<Output1>();

    // Create device
    var device = new Device(adapter);

    // Duplicate output
    var duplicatedOutput = output1.DuplicateOutput(device);

    while (!cancellationToken.IsCancellationRequested)
    {
        // Acquire next frame
        var result = duplicatedOutput.TryAcquireNextFrame(16, out var frameInfo, out var desktopResource);

        if (result.Success)
        {
            // Copy frame data
            using var texture = desktopResource.QueryInterface<Texture2D>();
            byte[] frameData = CopyTextureToBytes(device, texture);

            FrameCaptured?.Invoke(this, frameData);

            duplicatedOutput.ReleaseFrame();
        }
    }

    // Cleanup
    duplicatedOutput.Dispose();
}
```

### Priority 2: Video Encoding with FFmpeg

**File**: `Services/VideoRecordingService.cs`
**Method**: `StopRecordingAsync()`

#### Implementation Steps:

1. **Download FFmpeg**:
   - Get binaries from https://ffmpeg.org/download.html
   - Place `ffmpeg.exe` in output directory or system PATH

2. **Pipe Frames to FFmpeg**:

```csharp
public async Task<string> StopRecordingAsync()
{
    if (State != RecordingState.Recording && State != RecordingState.Paused)
        throw new InvalidOperationException("No recording in progress");

    _recordingTimer.Stop();
    State = RecordingState.Processing;

    // FFmpeg arguments
    var args = $"-f rawvideo -pix_fmt bgra -s {_config.Width}x{_config.Height} " +
               $"-r {_config.FrameRate} -i - " +
               $"-c:v libx264 -preset fast -crf {CalculateCRF(_config.VideoQuality)} " +
               $"-pix_fmt yuv420p \"{_outputPath}\"";

    // Start FFmpeg process
    var process = new Process
    {
        StartInfo = new ProcessStartInfo
        {
            FileName = "ffmpeg",
            Arguments = args,
            UseShellExecute = false,
            RedirectStandardInput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        }
    };

    process.Start();

    // Write frames to FFmpeg stdin
    using (var stdin = process.StandardInput.BaseStream)
    {
        foreach (var frame in _frames)
        {
            await stdin.WriteAsync(frame, 0, frame.Length);
        }
    }

    await process.WaitForExitAsync();

    _frames.Clear();
    State = RecordingState.Idle;

    return _outputPath ?? string.Empty;
}

private int CalculateCRF(int quality)
{
    // Convert quality (50-100) to CRF (28-15)
    // Lower CRF = higher quality
    return (int)(28 - (quality - 50) * 0.26);
}
```

### Priority 3: Mouse Zoom Effect

**File**: Create `Services/ZoomEffectService.cs`

```csharp
public interface IZoomEffectService
{
    byte[] ApplyZoom(byte[] frameData, Point mousePosition, double zoomLevel, int width, int height);
}

public class ZoomEffectService : IZoomEffectService
{
    public byte[] ApplyZoom(byte[] frameData, Point mousePosition, double zoomLevel, int width, int height)
    {
        if (zoomLevel <= 1.0)
            return frameData;

        // Calculate zoom region
        int zoomWidth = (int)(width / zoomLevel);
        int zoomHeight = (int)(height / zoomLevel);

        // Center on mouse position
        int zoomX = Math.Max(0, mousePosition.X - zoomWidth / 2);
        int zoomY = Math.Max(0, mousePosition.Y - zoomHeight / 2);

        // Clamp to frame boundaries
        zoomX = Math.Min(zoomX, width - zoomWidth);
        zoomY = Math.Min(zoomY, height - zoomHeight);

        // Crop and scale using ImageSharp or similar
        using var image = Image.Load<Bgra32>(frameData);
        image.Mutate(ctx => ctx
            .Crop(new Rectangle(zoomX, zoomY, zoomWidth, zoomHeight))
            .Resize(width, height));

        // Convert back to byte array
        using var ms = new MemoryStream();
        image.SaveAsBmp(ms);
        return ms.ToArray();
    }
}
```

**Integration**:
- Subscribe to `MouseTrackingService.MousePositionChanged` in `ScreenCaptureService`
- Apply zoom to each captured frame before raising `FrameCaptured` event

### Priority 4: Background Replacement

**File**: Create `Services/BackgroundCompositor.cs`

```csharp
public interface IBackgroundCompositor
{
    byte[] ComposeWithBackground(byte[] frameData, RecordingConfiguration config);
}

public class BackgroundCompositor : IBackgroundCompositor
{
    public byte[] ComposeWithBackground(byte[] frameData, RecordingConfiguration config)
    {
        // Load background
        using var background = LoadBackground(config);
        using var foreground = Image.Load<Bgra32>(frameData);

        // Create composite
        using var composite = new Image<Bgra32>(foreground.Width, foreground.Height);

        composite.Mutate(ctx =>
        {
            // Draw background
            ctx.DrawImage(background, 1.0f);

            // Draw foreground (possibly with transparency)
            ctx.DrawImage(foreground, 1.0f);
        });

        // Convert to byte array
        using var ms = new MemoryStream();
        composite.SaveAsBmp(ms);
        return ms.ToArray();
    }

    private Image<Bgra32> LoadBackground(RecordingConfiguration config)
    {
        if (!string.IsNullOrEmpty(config.BackgroundImagePath))
        {
            return Image.Load<Bgra32>(config.BackgroundImagePath);
        }

        // Create solid color background
        var bg = new Image<Bgra32>(1920, 1080); // Use actual screen dimensions
        bg.Mutate(ctx => ctx.Fill(new Bgra32(
            config.BackgroundColor.R,
            config.BackgroundColor.G,
            config.BackgroundColor.B,
            config.BackgroundColor.A
        )));

        return bg;
    }
}
```

### Priority 5: Browser Frame Detection & Removal

This is more complex and requires:

1. **Window Detection**:
   - Use Win32 API to detect browser windows
   - Identify window class names (Chrome, Firefox, Edge, etc.)

2. **Frame Measurement**:
   - Measure title bar height
   - Detect toolbar height
   - Calculate content area

3. **Cropping**:
   - Crop captured frame to content area only

**File**: Create `Services/WindowDetectionService.cs`

```csharp
[DllImport("user32.dll")]
static extern IntPtr GetForegroundWindow();

[DllImport("user32.dll")]
static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

[DllImport("user32.dll")]
static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

public class WindowDetectionService
{
    private static readonly string[] BrowserClasses = {
        "Chrome_WidgetWin_1",  // Chrome
        "MozillaWindowClass",  // Firefox
        "ApplicationFrameWindow" // Edge
    };

    public Rectangle GetBrowserContentArea()
    {
        var hwnd = GetForegroundWindow();
        // Implement browser window detection
        // Return content area rectangle
    }
}
```

## Adding New Features

### Adding a New Configuration Option

1. **Add to Model** (`Models/RecordingConfiguration.cs`):
   ```csharp
   public bool ShowCursor { get; set; } = true;
   ```

2. **Add to UI** (`Views/MainWindow.xaml`):
   ```xaml
   <CheckBox IsChecked="{Binding Configuration.ShowCursor}"
             Content="Show Cursor"/>
   ```

3. **Use in Service**:
   ```csharp
   if (_config.ShowCursor)
   {
       DrawCursor(frame, mousePosition);
   }
   ```

### Adding a New Service

1. **Create Interface**:
   ```csharp
   public interface IMyService
   {
       void DoSomething();
   }
   ```

2. **Implement**:
   ```csharp
   public class MyService : IMyService
   {
       public void DoSomething() { }
   }
   ```

3. **Register in ViewModel**:
   ```csharp
   private readonly IMyService _myService = new MyService();
   ```

## Code Style Guidelines

- Use C# 12 features where appropriate
- Follow Microsoft naming conventions
- Use `async`/`await` for I/O operations
- Dispose of resources properly (`using` statements)
- Document public APIs with XML comments
- Keep methods focused (single responsibility)

## Testing

Add unit tests for services:

```csharp
[Fact]
public void MouseTrackingService_Should_RaiseEvent_When_MouseMoves()
{
    // Arrange
    var service = new MouseTrackingService();
    Point? capturedPosition = null;
    service.MousePositionChanged += (s, p) => capturedPosition = p;

    // Act
    service.StartTracking();
    // Move mouse...

    // Assert
    Assert.NotNull(capturedPosition);
}
```

## Pull Request Process

1. Create a feature branch
2. Implement your changes
3. Add tests if applicable
4. Update README.md if adding new features
5. Submit PR with description of changes

## Questions?

Open an issue for questions or clarifications.
