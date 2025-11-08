using System.Drawing;

namespace ScreenRecorder.Services;

/// <summary>
/// Service for tracking mouse position and applying auto-zoom
/// </summary>
public interface IMouseTrackingService
{
    /// <summary>
    /// Start tracking mouse position
    /// </summary>
    void StartTracking();

    /// <summary>
    /// Stop tracking mouse position
    /// </summary>
    void StopTracking();

    /// <summary>
    /// Get current mouse position
    /// </summary>
    Point GetMousePosition();

    /// <summary>
    /// Event raised when mouse position changes
    /// </summary>
    event EventHandler<Point>? MousePositionChanged;
}
