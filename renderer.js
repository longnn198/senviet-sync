document
  .getElementById("check-sync-products")
  .addEventListener("click", async () => {
    await window.sync.checkSyncStatusOfProducts();
  });

document
  .getElementById("check-sync-customers")
  .addEventListener("click", async () => {
    await window.sync.checkSyncStatusOfCustomers();
  });
