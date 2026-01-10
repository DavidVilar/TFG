const path = require("path");
const { analyzeProject } = require("../core/analyzer");

describe("analyzeProject()", () => {
  test("analyzes a project and returns stats and routes", () => {
    const projectRoot = path.join(__dirname, "fixtures", "projects", "whitelist-project");

    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const result = analyzeProject(projectRoot, { folderWhitelist: [], logger });

    expect(result.projectRoot).toBe(projectRoot);
    expect(result.stats.totalSourceFiles).toBeGreaterThan(0);
    expect(result.stats.routesCount).toBeGreaterThan(0);
    expect(Array.isArray(result.routes)).toBe(true);

    expect(logger.info).toHaveBeenCalled();
  });

  test("respects folderWhitelist", () => {
    const projectRoot = path.join(__dirname, "fixtures", "projects", "whitelist-project");

    const all = analyzeProject(projectRoot, { folderWhitelist: [] });
    const onlyRoutes = analyzeProject(projectRoot, { folderWhitelist: ["routes"] });

    expect(all.stats.routesCount).toBeGreaterThanOrEqual(onlyRoutes.stats.routesCount);

    const pathsOnly = onlyRoutes.routes.map(r => r.path);
    expect(pathsOnly).toContain("/routes-only");
    expect(pathsOnly).not.toContain("/src-api");
  });
});
