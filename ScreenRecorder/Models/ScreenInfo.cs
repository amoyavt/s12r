namespace ScreenRecorder.Models;

/// <summary>
/// Information about an available screen/monitor
/// </summary>
public class ScreenInfo
{
    public int Index { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Width { get; set; }
    public int Height { get; set; }
    public bool IsPrimary { get; set; }

    public override string ToString() => $"{Name} ({Width}x{Height}){(IsPrimary ? " - Primary" : "")}";
}
