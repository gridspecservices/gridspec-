const { app, BrowserWindow, shell } = require("electron");

const APP_URL =
  process.env.GRIDSPEC_APP_URL || "https://handy-darkcyan-softwaresuite.replit.app";
const applicationHost = new URL(APP_URL).hostname;

app.setName("GridSpec");
if (process.platform === "win32") {
  app.setAppUserModelId("com.gridspec.desktop");
}

function isTrustedHost(hostname) {
  return (
    hostname === applicationHost ||
    hostname === "replit.com" ||
    hostname.endsWith(".replit.com") ||
    hostname.endsWith(".replit.app") ||
    hostname === "google.com" ||
    hostname.endsWith(".google.com")
  );
}

function isTrustedNavigation(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && isTrustedHost(url.hostname);
  } catch {
    return false;
  }
}

async function openExternal(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === "https:" || url.protocol === "mailto:") {
      await shell.openExternal(url.href);
    }
  } catch {
    // Ignore malformed links rather than passing them to the system browser.
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 900,
    minHeight: 620,
    title: "GridSpec",
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f1f5f4",
    ...(process.platform === "win32"
      ? { icon: `${__dirname}/resources/icon.png` }
      : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => window.show());

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (!isTrustedNavigation(url)) {
      void openExternal(url);
    }
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedNavigation(url)) {
      event.preventDefault();
      void openExternal(url);
    }
  });

  window.webContents.on("will-redirect", (event, url) => {
    if (!isTrustedNavigation(url)) {
      event.preventDefault();
      void openExternal(url);
    }
  });

  window.webContents.on(
    "did-fail-load",
    (_event, errorCode, _description, _validatedUrl, isMainFrame) => {
      if (isMainFrame && errorCode !== -3 && !window.isDestroyed()) {
        void window.loadFile(`${__dirname}/offline.html`);
      }
    },
  );

  void window.loadURL(APP_URL);
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
