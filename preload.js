const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("darkMode", {
  toggle: () => ipcRenderer.invoke("sync-products"),
  system: () => ipcRenderer.invoke("dark-mode:system"),
});
