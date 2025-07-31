const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
// Consider app.isPackaged to detect development mode reliably
const isDev = !app.isPackaged;

// Database setup
const dbPath = path.join(
  process.env.APPDATA || path.resolve('./'),
  'EyercallData',
  'inventory.db'
);

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Start backend server in production
if (!isDev) {
  // Get the correct path whether in asar or not
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'server.js')
    : path.join(__dirname, '..', 'backend', 'server.js');

  // Pass the resource path to the backend process
  backendProcess = fork(backendPath, [], { 
    env: { 
      ...process.env, 
      NODE_ENV: 'production',
      PORT: '4000',
      RESOURCE_PATH: process.resourcesPath,
      APP_PATH: app.getPath('userData')
    } 
  });
  
  backendProcess.on('error', (error) => {
    console.error('Backend process error:', error);
    dialog.showErrorBox(
      'Backend Error',
      `The application encountered an error: ${error.message}\nPlease restart the application.`
    );
  });
  
  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`);
    if (code !== 0) {
      dialog.showErrorBox(
        'Backend Process Terminated',
        `The backend process terminated unexpectedly with code ${code}.\nPlease restart the application.`
      );
    }
  });

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for database path
ipcMain.handle('get-db-path', () => {
  return dbPath;
});

ipcMain.handle('get-app-data-path', () => {
  return process.env.APPDATA || path.resolve('./');
}); 