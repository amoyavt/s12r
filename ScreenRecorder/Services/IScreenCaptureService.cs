using ScreenRecorder.Models;

namespace ScreenRecorder.Services;

/// <summary>
/// Service for capturing screen content
/// </summary>
public interface IScreenCaptureService
{
    /// <summary>
    /// Get all available screens
    /// </summary>
    List<ScreenInfo> GetAvailableScreens();

    /// <summary>
    /// Start capturing the specified screen
    /// </summary>
    Task StartCaptureAsync(int screenIndex);

    /// <summary>
    /// Stop screen capture
    /// </summary>
    Task StopCaptureAsync();

    /// <summary>
    /// Event raised when a new frame is captured
    /// </summary>
    event EventHandler<byte[]>? FrameCaptured;
}
