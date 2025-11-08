using System.Drawing;
using System.Runtime.InteropServices;

namespace ScreenRecorder.Services;

/// <summary>
/// Implementation of mouse tracking using Win32 API
/// </summary>
public class MouseTrackingService : IMouseTrackingService
{
    private System.Threading.Timer? _trackingTimer;
    private Point _lastPosition;

    public event EventHandler<Point>? MousePositionChanged;

    [DllImport("user32.dll")]
    private static extern bool GetCursorPos(out POINT lpPoint);

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT
    {
        public int X;
        public int Y;
    }

    public void StartTracking()
    {
        // Poll mouse position every 16ms (~60 FPS)
        _trackingTimer = new System.Threading.Timer(
            TrackMousePosition,
            null,
            TimeSpan.Zero,
            TimeSpan.FromMilliseconds(16)
        );
    }

    public void StopTracking()
    {
        _trackingTimer?.Dispose();
        _trackingTimer = null;
    }

    public Point GetMousePosition()
    {
        GetCursorPos(out POINT point);
        return new Point(point.X, point.Y);
    }

    private void TrackMousePosition(object? state)
    {
        var currentPosition = GetMousePosition();

        if (currentPosition != _lastPosition)
        {
            _lastPosition = currentPosition;
            MousePositionChanged?.Invoke(this, currentPosition);
        }
    }
}
