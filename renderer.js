document
  .getElementById("check-sync-products")
  .addEventListener("click", async () => {
    await window.sync.checkSyncStatusOfProducts();
    console.log("hihi");
  });

document
  .getElementById("check-sync-customers")
  .addEventListener("click", async () => {
    await window.sync.checkSyncStatusOfCustomers();
  });
