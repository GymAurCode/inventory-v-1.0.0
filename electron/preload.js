const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path')
}); 