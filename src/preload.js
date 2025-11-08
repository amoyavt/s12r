const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Screen capture
  getScreens: () => ipcRenderer.invoke('get-screens'),
  getSources: () => ipcRenderer.invoke('get-sources'),

  // Mouse tracking
  getMousePosition: () => ipcRenderer.invoke('get-mouse-position'),

  // File dialogs
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // File operations
  saveRecording: (filePath, buffer) => ipcRenderer.invoke('save-recording', { filePath, buffer })
});
