const { app, BrowserWindow, ipcMain, screen, globalShortcut, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { createOverlay } = require('./overlay/overlay-main');

// Windows marks unfocused windows as "occluded" and Chromium stops compositing them —
// with a transparent frameless window that reads as the whole app vanishing on click-away.
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

const DEFAULT_WIDTH = 340, DEFAULT_HEIGHT = 560, CONCISE_HEIGHT = 320, COLLAPSED_HEIGHT = 170;
const MIN_WIDTH = 260, MIN_HEIGHT = 150, MAX_WIDTH = 640, MAX_HEIGHT = 920;
let win, tray, overlay, isQuitting = false;

const dataFile = () => path.join(app.getPath('userData'), 'sneezy-note.json');
const defaults = { tasks: [], nudgeMin: 45, collapsed: false, expanded: false, login: false, bounds: null, pets: ['dog'], sound: true, theme: 'matcha', size: 'M' };

function loadState() {
  try { return { ...defaults, ...JSON.parse(fs.readFileSync(dataFile(), 'utf8')) }; }
  catch { return { ...defaults }; }
}
function saveState(s) {
  try { fs.writeFileSync(dataFile(), JSON.stringify(s)); } catch (e) { console.error(e); }
}

function heightFor(s) {
  if (s.collapsed) return COLLAPSED_HEIGHT;
  return s.expanded ? DEFAULT_HEIGHT : CONCISE_HEIGHT;
}

function clampToDisplay(b) {
  const wa = screen.getDisplayMatching(b).workArea;
  const width = Math.min(Math.max(b.width, MIN_WIDTH), MAX_WIDTH);
  const height = Math.min(Math.max(b.height, MIN_HEIGHT), MAX_HEIGHT);
  const x = Math.min(Math.max(b.x, wa.x), wa.x + wa.width - width);
  const y = Math.min(Math.max(b.y, wa.y), wa.y + wa.height - height);
  return { x, y, width, height };
}

function createWindow() {
  const s = loadState();
  const h = heightFor(s);
  const wa = screen.getPrimaryDisplay().workArea;
  const fallback = {
    width: DEFAULT_WIDTH, height: h,
    x: wa.x + wa.width - DEFAULT_WIDTH - 24,
    y: wa.y + wa.height - h - 16
  };
  const bounds = clampToDisplay(s.bounds || fallback);

  win = new BrowserWindow({
    ...bounds,
    frame: false, transparent: true, hasShadow: false,
    resizable: true, minWidth: MIN_WIDTH, minHeight: MIN_HEIGHT, maxWidth: MAX_WIDTH, maxHeight: MAX_HEIGHT,
    maximizable: false, fullscreenable: false,
    alwaysOnTop: true, skipTaskbar: false,
    backgroundColor: '#00000000',
    title: 'Sneezy Note',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true);
  win.loadFile('index.html');
  overlay = createOverlay(win);          // the full-screen layer the pets walk on

  let persistTimer;
  const persistBounds = () => {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      if (!win) return;
      const st = loadState();
      saveState({ ...st, bounds: win.getBounds() });
    }, 300);
  };
  win.on('move', persistBounds);
  win.on('resize', persistBounds);

  win.on('close', (e) => {
    if (isQuitting) return;
    e.preventDefault();
    win.hide();
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray32.png'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Sneezy Note');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show Sneezy Note', click: () => { win.show(); win.focus(); } },
    { label: 'Hide', click: () => win.hide() },
    { type: 'separator' },
    { label: 'Quit Sneezy Note', click: () => { isQuitting = true; app.quit(); } }
  ]));
  tray.on('click', () => {
    if (win.isVisible()) win.hide(); else { win.show(); win.focus(); }
  });
}

const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();
else {
  app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });
  app.whenReady().then(() => {
    createWindow();
    createTray();
    globalShortcut.register('CommandOrControl+Alt+N', () => {
      if (!win) return;
      win.show(); win.focus();
      win.webContents.send('focus-add');
    });
  });
  app.on('before-quit', () => { isQuitting = true; });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => {}); // keep running in the tray
}

ipcMain.handle('load', () => loadState());
ipcMain.on('save', (_e, s) => saveState(s));
ipcMain.on('set-height', (_e, h) => {
  if (!win) return;
  const b = win.getBounds();
  const bottom = b.y + b.height;
  win.setBounds({ x: b.x, y: bottom - h, width: b.width, height: h });
});
ipcMain.on('alert', () => {
  if (!win) return;
  win.showInactive();
  win.flashFrame(true);
  setTimeout(() => win && win.flashFrame(false), 2500);
});
ipcMain.on('set-login', (_e, on) => app.setLoginItemSettings({ openAtLogin: !!on }));
ipcMain.on('hide', () => { if (win) win.hide(); });
ipcMain.on('quit', () => { isQuitting = true; app.quit(); });

let dragOrigin = null;
ipcMain.on('drag-start', () => { if (win) dragOrigin = win.getBounds(); });
ipcMain.on('drag-move', (_e, dx, dy) => {
  if (!win || !dragOrigin) return;
  win.setPosition(Math.round(dragOrigin.x + dx), Math.round(dragOrigin.y + dy));
});

let resizeOrigin = null, resizeEdge = null;
ipcMain.on('resize-start', (_e, edge) => { if (win) { resizeOrigin = win.getBounds(); resizeEdge = edge; } });
ipcMain.on('resize-move', (_e, dx, dy) => {
  if (!win || !resizeOrigin || !resizeEdge) return;
  const o = resizeOrigin;
  let { x, y, width, height } = o;
  if (resizeEdge.includes('e')) width = o.width + dx;
  if (resizeEdge.includes('s')) height = o.height + dy;
  if (resizeEdge.includes('w')) { width = o.width - dx; }
  if (resizeEdge.includes('n')) { height = o.height - dy; }
  width = Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH);
  height = Math.min(Math.max(height, MIN_HEIGHT), MAX_HEIGHT);
  if (resizeEdge.includes('w')) x = o.x + (o.width - width);
  if (resizeEdge.includes('n')) y = o.y + (o.height - height);
  win.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
});
