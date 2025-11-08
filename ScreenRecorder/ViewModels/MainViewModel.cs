using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using ScreenRecorder.Models;
using ScreenRecorder.Services;
using System.Collections.ObjectModel;
using System.Windows;

namespace ScreenRecorder.ViewModels;

/// <summary>
/// Main view model for the application
/// </summary>
public partial class MainViewModel : ObservableObject
{
    private readonly IScreenCaptureService _screenCaptureService;
    private readonly IMouseTrackingService _mouseTrackingService;
    private readonly IVideoRecordingService _videoRecordingService;

    [ObservableProperty]
    private RecordingConfiguration _configuration = new();

    [ObservableProperty]
    private RecordingState _recordingState = RecordingState.Idle;

    [ObservableProperty]
    private ObservableCollection<ScreenInfo> _availableScreens = new();

    [ObservableProperty]
    private ScreenInfo? _selectedScreen;

    [ObservableProperty]
    private TimeSpan _recordingDuration;

    [ObservableProperty]
    private string _statusMessage = "Ready to record";

    public MainViewModel()
    {
        // Initialize services
        _screenCaptureService = new ScreenCaptureService();
        _mouseTrackingService = new MouseTrackingService();
        _videoRecordingService = new VideoRecordingService();

        // Load available screens
        LoadScreens();

        // Start mouse tracking (lightweight background task)
        _mouseTrackingService.StartTracking();
    }

    private void LoadScreens()
    {
        var screens = _screenCaptureService.GetAvailableScreens();
        AvailableScreens = new ObservableCollection<ScreenInfo>(screens);

        if (screens.Count > 0)
        {
            SelectedScreen = screens[0];
        }
    }

    [RelayCommand]
    private async Task StartRecordingAsync()
    {
        try
        {
            if (SelectedScreen == null)
            {
                StatusMessage = "Please select a screen to record";
                return;
            }

            Configuration.ScreenIndex = SelectedScreen.Index;

            await _videoRecordingService.StartRecordingAsync(Configuration);
            await _screenCaptureService.StartCaptureAsync(Configuration.ScreenIndex);

            RecordingState = RecordingState.Recording;
            StatusMessage = "Recording...";

            // Start duration timer
            StartDurationTimer();
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
    }

    [RelayCommand]
    private async Task StopRecordingAsync()
    {
        try
        {
            StatusMessage = "Processing video...";
            RecordingState = RecordingState.Processing;

            await _screenCaptureService.StopCaptureAsync();
            var outputPath = await _videoRecordingService.StopRecordingAsync();

            RecordingState = RecordingState.Idle;
            StatusMessage = $"Recording saved: {Path.GetFileName(outputPath)}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
            RecordingState = RecordingState.Idle;
        }
    }

    [RelayCommand]
    private void PauseRecording()
    {
        _videoRecordingService.PauseRecording();
        RecordingState = RecordingState.Paused;
        StatusMessage = "Paused";
    }

    [RelayCommand]
    private void ResumeRecording()
    {
        _videoRecordingService.ResumeRecording();
        RecordingState = RecordingState.Recording;
        StatusMessage = "Recording...";
    }

    [RelayCommand]
    private void SelectOutputFolder()
    {
        var dialog = new System.Windows.Forms.FolderBrowserDialog
        {
            Description = "Select output folder for recordings",
            SelectedPath = Configuration.OutputFolder
        };

        if (dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
        {
            Configuration.OutputFolder = dialog.SelectedPath;
        }
    }

    private async void StartDurationTimer()
    {
        while (RecordingState == RecordingState.Recording || RecordingState == RecordingState.Paused)
        {
            RecordingDuration = _videoRecordingService.Duration;
            await Task.Delay(100);
        }
        RecordingDuration = TimeSpan.Zero;
    }
}
