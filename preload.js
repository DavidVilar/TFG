const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  selectProjectDir: () => ipcRenderer.invoke("select-project-dir"),
  analyzeProject: (dir) => ipcRenderer.invoke("analyze-project", dir),
  exportDoc: (format) => ipcRenderer.invoke("export-doc", { format }),

  githubSetToken: (token) => ipcRenderer.invoke("github-set-token", token),
  githubListRepos: () => ipcRenderer.invoke("github-list-repos"),
  githubAnalyzeRepo: (fullName) =>
    ipcRenderer.invoke("github-analyze-repo", { fullName }),
});
