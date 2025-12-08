const fs = require("fs");
const os = require("os");
const path = require("path");
const simpleGit = require("simple-git");
const { Octokit } = require("@octokit/rest");
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const {
  analyzeProject,
  buildOpenApiDocFromRoutes,
  buildJsdocFromRoutes,
} = require("./core/analyzer");

let lastProjectAnalysis = null;

let githubToken = null;
let octokit = null;


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

ipcMain.handle("github-set-token", async (_event, token) => {
  try {
    githubToken = token;
    octokit = new Octokit({ auth: token });

    const { data } = await octokit.rest.users.getAuthenticated();
    return { ok: true, login: data.login };
  } catch (e) {
    console.error("Error validant token GitHub:", e.message);
    githubToken = null;
    octokit = null;
    return { ok: false, error: e.message };
  }
});

ipcMain.handle("github-list-repos", async () => {
  if (!octokit) {
    return { error: "No hi ha cap token de GitHub configurat." };
  }
  try {
    const res = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: "updated",
    });
    const repos = res.data.map((r) => ({
      full_name: r.full_name,
      clone_url: r.clone_url,
      private: r.private,
    }));
    return { repos };
  } catch (e) {
    console.error("Error llistant repos:", e.message);
    return { error: e.message };
  }
});

ipcMain.handle("github-analyze-repo", async (_event, { fullName }) => {
  if (!octokit) {
    return { error: "GitHub no configurat." };
  }

  try {
    const baseTmpDir = path.join(os.tmpdir(), "tfg-docgen");
    if (!fs.existsSync(baseTmpDir)) fs.mkdirSync(baseTmpDir, { recursive: true });

    const localDir = path.join(
      baseTmpDir,
      fullName.replace("/", "_")
    );

    const git = simpleGit();

    const cloneUrl = `https://github.com/${fullName}.git`;

    if (!fs.existsSync(localDir)) {
      await git.clone(cloneUrl, localDir);
    } else {
      await simpleGit({ baseDir: localDir }).pull();
    }

    const result = analyzeProject(localDir);
    lastProjectAnalysis = result;
    return result;
  } catch (e) {
    console.error("Error analitzant repo GitHub:", e);
    return { error: e.message };
  }
});
