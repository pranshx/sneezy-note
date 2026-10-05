// Full-screen, transparent, click-through window where the pets live.
// Call createOverlay(noteWindow) once the note window exists.
const { BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

function createOverlay(noteWin) {
  const wa = screen.getDisplayMatching(noteWin.getBounds()).workArea; // floor = just above the taskbar
  const win = new BrowserWindow({
    x: wa.x, y: wa.y, width: wa.width, height: wa.height,
    frame: false, transparent: true, hasShadow: false, resizable: false, movable: false,
    focusable: false, skipTaskbar: true, alwaysOnTop: true, backgroundColor: '#00000000',
    title: 'Sneezy Note pets',
    webPreferences: { preload: path.join(__dirname, 'overlay-preload.js'), contextIsolation: true }
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });   // clicks fall through to your apps...
  win.loadFile(path.join(__dirname, 'overlay.html'));

  // ...except while the pointer is over a pet (the overlay tells us)
  ipcMain.on('overlay-hover', (_e, over) => { if (!win.isDestroyed()) win.setIgnoreMouseEvents(!over, { forward: true }); });

  // The note's paper rectangle (in note-window coordinates). The renderer can report it
  // precisely via api.petsNoteRect(); otherwise we assume a 14px margin.
  let paper = null;
  const sendRect = () => {
    if (win.isDestroyed() || noteWin.isDestroyed()) return;
    const b = noteWin.getBounds();
    const r = paper || { x: 14, y: 14, w: b.width - 28, h: b.height - 28 };
    win.webContents.send('note-rect', { x: b.x + r.x - wa.x, y: b.y + r.y - wa.y, w: r.w, h: r.h, visible: noteWin.isVisible() && r.w > 0 });
  };
  noteWin.on('move', sendRect); noteWin.on('resize', sendRect); noteWin.on('show', sendRect); noteWin.on('hide', sendRect);
  win.webContents.on('did-finish-load', sendRect);
  ipcMain.on('pets-note-rect', (_e, r) => { paper = r; sendRect(); });

  // note -> pets
  ipcMain.on('pets-remind', (_e, text) => win.webContents.send('remind', text));
  ipcMain.on('pets-cmd', (_e, cmd) => win.webContents.send('cmd', cmd));
  // pets -> note (the moment the pet "hands over" the reminder)
  ipcMain.on('pets-deliver', (_e, info) => { if (!noteWin.isDestroyed()) noteWin.webContents.send('pet-deliver', info); });
  ipcMain.on('overlay-ready', () => { if (!noteWin.isDestroyed()) noteWin.webContents.send('overlay-ready'); });
  noteWin.on('focus', () => { if (!win.isDestroyed()) win.moveTop(); });
  noteWin.on('closed', () => { if (!win.isDestroyed()) win.close(); });
  return win;
}
module.exports = { createOverlay };
