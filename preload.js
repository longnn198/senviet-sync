const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sync", {
  checkSyncStatusOfProducts: () => ipcRenderer.invoke("check-sync-products"),
  checkSyncStatusOfCustomers: () => ipcRenderer.invoke("check-sync-customers"),
});
