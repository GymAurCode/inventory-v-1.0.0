const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

// Consider app.isPackaged to detect development mode reliably
const isDev = !app.isPackaged;

// Database setup - ensure it's in userData directory
const dbPath = path.join(app.getPath('userData'), 'database.sqlite');

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
  // Locate backend entry point
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'server.js')
    : path.join(__dirname, '..', 'backend', 'server.js');

  console.log('Backend path:', backendPath);
  console.log('Database path:', dbPath);
  console.log('User data path:', app.getPath('userData'));

  // Launch backend as a separate Node process
  backendProcess = fork(backendPath, [], {
    cwd: path.dirname(backendPath), // make sure relative requires resolve correctly
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '4000',
      RESOURCE_PATH: process.resourcesPath,
      APP_PATH: app.getPath('userData'),
      DB_PATH: dbPath,
      ELECTRON_RUN_AS_NODE: '1' // run the executable in pure Node mode
    },
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'] // Enable IPC for better communication
  });
  
  // Handle backend stdout/stderr
  backendProcess.stdout.on('data', (data) => {
    console.log('Backend stdout:', data.toString());
  });
  
  backendProcess.stderr.on('data', (data) => {
    console.error('Backend stderr:', data.toString());
  });
  
  backendProcess.on('error', (error) => {
    console.error('Backend process error:', error);
    dialog.showErrorBox(
      'Backend Error',
      `The application encountered an error: ${error.message}\nPlease restart the application.`
    );
  });
  
  backendProcess.on('exit', (code, signal) => {
    console.log(`Backend process exited with code ${code} and signal ${signal}`);
    if (code !== 0) {
      dialog.showErrorBox(
        'Backend Process Terminated',
        `The backend process terminated unexpectedly with code ${code}.\nPlease restart the application.`
      );
    }
  });

  // Wait for backend to be ready
  backendProcess.on('message', (message) => {
    if (message.type === 'ready') {
      console.log('Backend is ready');
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (backendProcess) {
    console.log('Terminating backend process...');
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
  return app.getPath('userData');
}); 