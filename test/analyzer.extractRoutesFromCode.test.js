const fs = require("fs");
const path = require("path");
const { extractRoutesFromCode } = require("../core/analyzer");

function loadFixture(name) {
  return fs.readFileSync(path.join(__dirname, "fixtures", "code", name), "utf-8");
}

describe("extractRoutesFromCode()", () => {
  test("extracts basic express routes", () => {
    const code = loadFixture("simple-express.js");
    const routes = extractRoutesFromCode(code);

    expect(routes).toHaveLength(2);
    expect(routes[0]).toMatchObject({ method: "GET", path: "/users" });
    expect(routes[1]).toMatchObject({ method: "POST", path: "/users" });
  });

  test("resolves concatenated const vars", () => {
    const code = loadFixture("concat-vars.js");
    const routes = extractRoutesFromCode(code);

    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({ method: "GET", path: "/api/users" });
  });

  test("resolves template literal routes", () => {
    const code = loadFixture("template-literals.js");
    const routes = extractRoutesFromCode(code);

    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({ method: "GET", path: "/api/cars" });
  });

  test("skips non-statically evaluable routes and logs warn if logger provided", () => {
    const code = loadFixture("dynamic-path.js");

    const logger = { warn: jest.fn(), info: jest.fn(), error: jest.fn() };
    const routes = extractRoutesFromCode(code, { logger });

    expect(routes).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledTimes(1);

    const [msg, meta] = logger.warn.mock.calls[0];
    expect(String(msg)).toMatch(/Ruta no evaluable/i);
    expect(meta).toMatchObject({ method: "GET" });
  });
});
