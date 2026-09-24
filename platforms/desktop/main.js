// Desktop wrapper for Amulets of the Nile.
// It opens the single-file game in a window with a frozen copy of the Chromium
// engine, so it keeps working even when browsers change. It never goes online:
// every request that isn't to a local file is refused.
const { app, BrowserWindow, Menu, session, shell } = require('electron');
const path = require('path');

function createWindow() {
	const win = new BrowserWindow({
		width: 1280, height: 860, minWidth: 360, minHeight: 560,
		backgroundColor: '#3a2812',
		title: 'Amulets of Anubis',
		autoHideMenuBar: true,
		webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
	});
	win.loadFile(path.join(__dirname, 'game.html'));
	// F11 toggles full screen
	win.webContents.on('before-input-event', (e, input) => {
		if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
	});
	// links never open inside the game window
	win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(() => {
	Menu.setApplicationMenu(null);
	session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
		const ok = /^(file|data|blob|devtools|chrome-extension):/.test(details.url);
		cb({ cancel: !ok });
	});
	createWindow();
	app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
