const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs'); // Added for file checking

// Global Error Handler - Show User why it crashed
process.on('uncaughtException', (error) => {
  dialog.showErrorBox('Application Error', `Something went wrong:\n${error.stack || error.message}`);
});

// const waitOn = require('wait-on'); // Removed to fix production crash

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let backendProcess;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // For simple prototype, can be hardened later
    },
    title: "TextFX - AI Creative Director",
    backgroundColor: '#1a1a1a',
    show: true // SHOW IMMEDIATELY - Don't wait (Fix for "Nothing happens")
  });

  // Load the app
  if (app.isPackaged) {
    // Production: Load from built files
    mainWindow.loadFile(path.join(__dirname, '../app/dist/index.html'));
  } else {
    // Development: Load from Vite server
    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
    console.log(`Loading URL: ${startUrl}`);
    mainWindow.loadURL(startUrl);
  }

  // Show window when ready to reduce flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startBackend() {
  console.log('Starting Backend Server...');
  const backendPath = path.join(__dirname, '../backend');
  if (app.isPackaged) {
    // Production: Point to the compiled JS file, not the EXE directly unless configured
    const scriptPath = path.join(process.resourcesPath, 'backend/dist/index.js');
    if (fs.existsSync(scriptPath)) {
      console.log(`Spawning backend via Node: ${scriptPath}`);
      backendProcess = spawn(process.execPath, [scriptPath], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: '4002' },
        stdio: 'pipe'
      });
    } else {
      // Fallback: try local path if resourcesPath fails
      const localScriptPath = path.join(__dirname, '../backend/dist/index.js');
      if(fs.existsSync(localScriptPath)) {
        backendProcess = spawn(process.execPath, [localScriptPath], {
          env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: '4002' }
        });
      } else {
        console.error('Backend script not found!');
        dialog.showErrorBox('Error', 'Backend script missing in installation.');
        return;
      }
    }
  } else {
    // DEVELOPMENT
    const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    backendProcess = spawn(cmd, ['run', 'dev'], {
      cwd: backendPath,
      shell: true,
      env: { ...process.env, PORT: '4002' }
    });
  }
  if (backendProcess) {
    backendProcess.stdout.on('data', (data) => console.log(`Backend: ${data}`));
    backendProcess.stderr.on('data', (data) => console.error(`Backend Error: ${data}`));
    backendProcess.on('error', (err) => {
      console.error('Failed to start backend process:', err);
      dialog.showErrorBox('Backend Error', `Failed to start server: ${err.message}`);
    });
  }
}

app.on('ready', async () => {
  startBackend();

  // Wait for frontend and backend to be ready
  // In a real build, we'd serve static files, but for 'Dev EXE' we wait for ports
  try {
    console.log('Waiting for services...');
    // Note: In a full prod build, we wouldn't wait for localhost:5173
    // We would serve the file://
  } catch (err) {
    console.log('Error waiting for services', err);
  }

  createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    // Kill backend before quitting
    if (backendProcess) backendProcess.kill();
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// Ensure backend is killed on exit
app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});
