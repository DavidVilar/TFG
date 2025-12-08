const fs = require("fs");
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const {
  analyzeProject,
  buildOpenApiDocFromRoutes,
  buildJsdocFromRoutes,
} = require("./core/analyzer");

let lastProjectAnalysis = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("select-file", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "JavaScript", extensions: ["js", "jsx", "ts", "tsx"] }],
  });
  if (canceled || filePaths.length === 0) return null;
  return filePaths[0];
});

ipcMain.handle("analyze-file", async (_event, filePath) => {
  try {
    const model = analyzeFile(filePath);
    return model;
  } catch (e) {
    console.error(e);
    return { error: e.message };
  }
});

ipcMain.handle("select-project-dir", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (canceled || filePaths.length === 0) return null;
  return filePaths[0];
});

ipcMain.handle("analyze-project", async (_event, projectRoot) => {
  try {
    const result = analyzeProject(projectRoot);
    lastProjectAnalysis = result;
    return result;
  } catch (e) {
    console.error(e);
    return { error: e.message };
  }
});

ipcMain.handle("export-doc", async (_event, { format }) => {
  try {
    if (!lastProjectAnalysis) {
      throw new Error("No hi ha cap projecte analitzat encara.");
    }

    const { routes } = lastProjectAnalysis;

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Guardar documentació",
      defaultPath: format === "openapi" ? "openapi.json" : "routes-jsdoc.txt",
      filters:
        format === "openapi"
          ? [{ name: "JSON", extensions: ["json"] }]
          : [{ name: "Text", extensions: ["txt", "js"] }],
    });

    if (canceled || !filePath) {
      return { canceled: true };
    }

    let content;

    if (format === "openapi") {
      const openApiDoc = buildOpenApiDocFromRoutes(routes, {
        title: "API generada automàticament (projecte complet)",
        version: "1.0.0",
        serverUrl: "http://localhost:3000",
        descriptionByRouteFile: true,
      });
      content = JSON.stringify(openApiDoc, null, 2);
    } else if (format === "jsdoc") {
      content = buildJsdocFromRoutes(routes);
    } else {
      throw new Error("Format no suportat: " + format);
    }

    fs.writeFileSync(filePath, content, "utf-8");
    return { canceled: false, filePath };
  } catch (e) {
    console.error(e);
    return { error: e.message };
  }
});