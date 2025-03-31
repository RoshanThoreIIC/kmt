const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

const readFile = (p) => fs.readFileSync(path.join(__dirname, p), "utf8");

const script = readFile("vite-dist/assets/index.js");
const css = readFile("vite-dist/assets/index.css");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  win.loadURL("https://fancentro.com/");

  win.webContents.on("did-finish-load", () => {
    win.webContents.insertCSS(css);
    win.webContents.executeJavaScript(script);
  });
}

app.whenReady().then(createWindow);
