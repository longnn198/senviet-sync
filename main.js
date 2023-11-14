const axios = require("axios");
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const sql = require("msnodesqlv8");
const pgp = require("pg-promise")();
const db = pgp(
  "postgresql://postgres:ngoclong98@localhost:5432/senviet_db?schema=public"
);
let converter = require("json-2-csv");
const { File } = require("node:buffer");

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  win.loadFile("index.html");
  win.webContents.openDevTools();
}
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

//handler
const connectionString =
  "server=DESKTOP-B4P3601;Database=FA11_2022;Trusted_Connection=Yes;Driver={SQL Server Native Client 10.0}";

const checkSyncStatusOfProducts = async () => {
  const productOnApp = await db
    .any("SELECT code FROM product")
    .then((data) => {
      return data;
    })
    .catch((error) => {
      console.error("Error pg:", error);
      throw new Error();
    });

  const code = productOnApp.map(({ code }) => `'${code}'`).join(",");

  const querySelect = `
    SELECT dmvt.ma_vt as code,dmvt.ten_vt as name,dmvt.dvt as unit,SUM(cdvt13.ton13) as quantity
    FROM dmvt
    INNER JOIN cdvt13 ON dmvt.ma_vt = cdvt13.ma_vt
    where dmvt.ma_vt in (${code})
    GROUP BY dmvt.ma_vt,dmvt.ten_vt,dmvt.dvt;
    `;

  sql.open(connectionString, async (err, conn) => {
    if (err) {
      console.error("Error connecting: ", err);
      return;
    }
    conn.query(querySelect, async (err, results) => {
      if (err) {
        console.error("Error querying: ", err);
        return;
      }
      const products = results.map(({ code, name, quantity, unit }) => ({
        code: code.trim(),
        name: name.trim(),
        quantity: quantity,
        unit: unit.trim(),
      }));
      await axios.patch("https://sv.c2web3.com/sync-products", {
        products: products,
      });

      console.log("Check Status Products Succeed");
    });
  });
};

ipcMain.handle("check-sync-products", () => {
  checkSyncStatusOfProducts();
});

const checkSyncStatusOfCustomers = async () => {
  const querySelect = `
    SELECT ma_kh as phone,ten_kh as name,dia_chi as address
    FROM dmkh
    `;

  sql.open(connectionString, async (err, conn) => {
    if (err) {
      console.error("Error connecting: ", err);
      return;
    }
    conn.query(querySelect, async (err, results) => {
      if (err) {
        console.error("Error querying: ", err);
        return;
      }
      const customer = results.map(({ phone, name, address }) => ({
        phone: phone.trim(),
        name: name.trim(),
        address: address.trim(),
      }));
      const customerCSV = converter.json2csv(customer);

      await axios.patch("https://sv.c2web3.com/sync-customer", {
        csv: customerCSV,
      });

      console.log("Check product synchronization status");
    });
  });
};

ipcMain.handle("check-sync-customers", () => {
  checkSyncStatusOfCustomers();
});
