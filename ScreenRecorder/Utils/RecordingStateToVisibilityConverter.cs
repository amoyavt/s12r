using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace ScreenRecorder.Utils;

/// <summary>
/// Converter to show/hide UI elements based on recording state
/// </summary>
public class RecordingStateToVisibilityConverter : IMultiValueConverter
{
    public object Convert(object[] values, Type targetType, object parameter, CultureInfo culture)
    {
        if (values.Length < 1)
            return Visibility.Collapsed;

        // Simple visibility based on any recording state
        var currentState = values[0]?.ToString();
        return string.IsNullOrEmpty(currentState) || currentState == "Idle"
            ? Visibility.Collapsed
            : Visibility.Visible;
    }

    public object[] ConvertBack(object value, Type[] targetTypes, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
