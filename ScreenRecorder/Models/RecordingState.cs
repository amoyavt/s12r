namespace ScreenRecorder.Models;

/// <summary>
/// Represents the current state of the recording
/// </summary>
public enum RecordingState
{
    Idle,
    Recording,
    Paused,
    Processing
}
