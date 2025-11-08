# Quick Start Guide

Get up and running in 5 minutes!

## Step 1: Install Node.js

**Windows:**
1. Download from [nodejs.org](https://nodejs.org/)
2. Run installer (choose LTS version)
3. Verify: Open Command Prompt and type `node --version`

**macOS:**
```bash
# Using Homebrew
brew install node

# Or download from nodejs.org
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm

# Fedora
sudo dnf install nodejs npm

# Arch
sudo pacman -S nodejs npm
```

## Step 2: Clone & Install

```bash
# Clone the repository
git clone <your-repo-url>
cd s12r

# Install dependencies
npm install
```

This will download all required Electron packages (~200MB).

## Step 3: Run the App

```bash
npm start
```

The app window should open automatically!

## Step 4: First Recording

1. **Select a source**: Click the dropdown and choose a screen/window
2. **Configure**: Adjust zoom level, frame rate, and quality as needed
3. **Click "Start Recording"**: The red button at the bottom
4. **Stop**: Click "Stop Recording" when done
5. **Save**: Choose where to save your video

## Common Issues

### "Cannot find module 'electron'"

Run `npm install` again.

### Screen capture permission denied (macOS)

1. Open System Preferences → Security & Privacy
2. Go to "Screen Recording"
3. Enable the app

### Black screen when recording

- Make sure you selected the correct source
- On Linux, try running with: `npm run dev`

## Next Steps

- Read the full [README.md](README.md) for all features
- Check out configuration options in the UI
- Customize the code to add your own features!

## Building Executable

To create a standalone app:

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

The executable will be in the `dist/` folder.

## Getting Help

- Read [README.md](README.md) for detailed documentation
- Check [GitHub Issues](../../issues) for known problems
- Open a new issue if you need help

Happy recording! 🎥
