const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('overlayApi', {
  ready: () => ipcRenderer.send('overlay-ready'),
  hover: over => ipcRenderer.send('overlay-hover', over),
  deliver: info => ipcRenderer.send('pets-deliver', info),
  onNoteRect: cb => ipcRenderer.on('note-rect', (_e, r) => cb(r)),
  onRemind: cb => ipcRenderer.on('remind', (_e, t) => cb(t)),
  onCmd: cb => ipcRenderer.on('cmd', (_e, c) => cb(c))
});
