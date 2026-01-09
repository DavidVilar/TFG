const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  selectProjectDir: () => ipcRenderer.invoke("select-project-dir"),
  analyzeProject: (dir) => ipcRenderer.invoke("analyze-project", dir),
  exportDoc: (format) => ipcRenderer.invoke("export-doc", format),
  settingsLoad: () => ipcRenderer.invoke("settings-load"),
  settingsSave: (patch) => ipcRenderer.invoke("settings-save", patch),
  previewSwagger: () => ipcRenderer.invoke("preview-swagger"),
  previewJsdoc: () => ipcRenderer.invoke("preview-jsdoc"),

  githubSetToken: (token) => ipcRenderer.invoke("github-set-token", token),
  githubListRepos: () => ipcRenderer.invoke("github-list-repos"),
  githubListBranches: (fullName) => ipcRenderer.invoke("github-list-branches", fullName),
  githubAnalyzeRepo: (fullName, branch) => ipcRenderer.invoke("github-analyze-repo", { fullName, branch }),
});
