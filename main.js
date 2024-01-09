const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  ipcMain,
} = require("electron");
const path = require("path");
const localShortcut = require("electron-localshortcut");
const sql = require("msnodesqlv8");
const pgp = require("pg-promise")();
const db = pgp(
  "postgresql://postgres:ngoclong98@localhost:5432/senviet_db?schema=public"
);
let converter = require("json-2-csv");
const cron = require("node-cron");
const axios = require("axios");

let tray = null;
let mainWindow = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 200,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
    },
  });
  mainWindow.loadFile("index.html");
  const menuTemplate = [];
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  localShortcut.register(mainWindow, "Ctrl+Shift+I", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}
function createTray() {
  const iconPath = path.join(__dirname, "logo_deo.jpg");
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => {
        mainWindow.show();
      },
    },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Your Electron App");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}
app.whenReady().then(() => {
  createTray();
  createWindow();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

//handler
const connectionString =
  "server=DESKTOP-B4P3601;Database=FA11_2022;Trusted_Connection=Yes;Driver={SQL Server Native Client 10.0}";

const showNotification = ({ title, body }) => {
  const notification = new Notification({
    title: title,
    body: body,
  });
  notification.show();
};

const checkSyncStatusOfProducts = async () => {
  mainWindow.loadFile("loading.html");

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
  const querySelectString = `
    SELECT dmvt.ma_vt as code,dmvt.ten_vt as name,dmvt.dvt as unit
    FROM dmvt
    where dmvt.ma_vt in (${code})
    `;
  sql.open(connectionString, async (err, conn) => {
    if (err) {
      console.error("Error connecting: ", err);
      return;
    }
    conn.query(querySelectString, async (err, results) => {
      if (err) {
        console.error("Error querying: ", err);
        return;
      }
      const products = results.map(({ code, name, unit }) => ({
        code: code.trim(),
        name: name.trim(),
        unit: unit.trim(),
      }));
      await axios.patch("http://localhost:8080/sync-products", {
        products: products,
      });
      showNotification({
        title: "Thông báo!",
        body: "Hoàn tất kiểm tra trạng thái sản phẩm",
      });
      mainWindow.loadFile("index.html");
    });
  });
};

const checkSyncStatusOfCustomers = async () => {
  mainWindow.loadFile("loading.html");
  const querySelect = `
    SELECT ma_kh as phone,ten_kh as name,dia_chi as address
    FROM dmkh
    WHERE ISNUMERIC(ma_kh) = 1;
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
      await axios.patch("https://sv.offchainsaigon.com/sync-customer", {
        csv: customerCSV,
      });

      showNotification({
        title: "Thông báo",
        body: "Hoàn tất kiểm tra trạng thái đồng bộ thông tin khách hàng",
      });
      mainWindow.loadFile("index.html");
    });
  });
};

ipcMain.handle("check-sync-products", async () => {
  await checkSyncStatusOfProducts();
});
ipcMain.handle("check-sync-customers", async () => {
  await checkSyncStatusOfCustomers();
});
app.on("ready", async () => {
  cron.schedule("15 15 * * *", async () => {
    await checkSyncStatusOfProducts();
    await checkSyncStatusOfCustomers();
  });
});
