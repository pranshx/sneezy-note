const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  load: () => ipcRenderer.invoke('load'),
  save: (s) => ipcRenderer.send('save', s),
  setHeight: (h) => ipcRenderer.send('set-height', h),
  alert: () => ipcRenderer.send('alert'),
  setLogin: (on) => ipcRenderer.send('set-login', on),
  hide: () => ipcRenderer.send('hide'),
  quit: () => ipcRenderer.send('quit'),
  onFocusAdd: (cb) => ipcRenderer.on('focus-add', cb),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragMove: (dx, dy) => ipcRenderer.send('drag-move', dx, dy),
  resizeStart: (edge) => ipcRenderer.send('resize-start', edge),
  resizeMove: (dx, dy) => ipcRenderer.send('resize-move', dx, dy),
  petsRemind: (text) => ipcRenderer.send('pets-remind', text),
  petsCmd: (cmd) => ipcRenderer.send('pets-cmd', cmd),
  petsNoteRect: (r) => ipcRenderer.send('pets-note-rect', r),
  onPetDeliver: (cb) => ipcRenderer.on('pet-deliver', (_e, info) => cb(info)),
  onOverlayReady: (cb) => ipcRenderer.on('overlay-ready', cb)
});
