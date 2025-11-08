using ScreenRecorder.Models;

namespace ScreenRecorder.Services;

/// <summary>
/// Service for recording video with frames and encoding
/// </summary>
public interface IVideoRecordingService
{
    /// <summary>
    /// Start recording with the specified configuration
    /// </summary>
    Task StartRecordingAsync(RecordingConfiguration config);

    /// <summary>
    /// Stop recording and finalize the video file
    /// </summary>
    Task<string> StopRecordingAsync();

    /// <summary>
    /// Pause recording
    /// </summary>
    void PauseRecording();

    /// <summary>
    /// Resume recording
    /// </summary>
    void ResumeRecording();

    /// <summary>
    /// Add a frame to the recording
    /// </summary>
    void AddFrame(byte[] frameData);

    /// <summary>
    /// Current recording state
    /// </summary>
    RecordingState State { get; }

    /// <summary>
    /// Recording duration
    /// </summary>
    TimeSpan Duration { get; }
}
