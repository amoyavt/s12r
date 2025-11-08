using System.Windows.Media;

namespace ScreenRecorder.Models;

/// <summary>
/// Configuration for screen recording settings
/// </summary>
public class RecordingConfiguration
{
    /// <summary>
    /// Enable mouse pointer tracking and auto-zoom
    /// </summary>
    public bool EnableMouseTracking { get; set; } = true;

    /// <summary>
    /// Zoom level for mouse pointer (1.0 = no zoom, 2.0 = 2x zoom, etc.)
    /// </summary>
    public double ZoomLevel { get; set; } = 1.5;

    /// <summary>
    /// Screen index to record (0 = primary, 1+ = secondary screens)
    /// </summary>
    public int ScreenIndex { get; set; } = 0;

    /// <summary>
    /// Remove browser frame/chrome when recording browser windows
    /// </summary>
    public bool RemoveBrowserFrame { get; set; } = false;

    /// <summary>
    /// Background color or image to use behind the recording
    /// </summary>
    public Color BackgroundColor { get; set; } = Color.FromRgb(13, 13, 13);

    /// <summary>
    /// Path to custom background image (optional)
    /// </summary>
    public string? BackgroundImagePath { get; set; }

    /// <summary>
    /// Output video frame rate
    /// </summary>
    public int FrameRate { get; set; } = 60;

    /// <summary>
    /// Output video quality (1-100, higher is better)
    /// </summary>
    public int VideoQuality { get; set; } = 85;

    /// <summary>
    /// Output folder path
    /// </summary>
    public string OutputFolder { get; set; } = Environment.GetFolderPath(Environment.SpecialFolder.MyVideos);
}
