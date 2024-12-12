const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getChannels: () => ipcRenderer.invoke('get-channels'),
    saveChannel: (channel) => ipcRenderer.invoke('save-channel', channel),
    removeChannel: (url) => ipcRenderer.invoke('remove-channel', url),
    updateChannel: (channel) => ipcRenderer.invoke('update-channel', channel),
    migrateFromLocalStorage: (localStorage) => ipcRenderer.invoke('migrate-from-localstorage', localStorage)
});
