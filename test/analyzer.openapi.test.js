const { buildOpenApiDocFromRoutes } = require("../core/analyzer");

describe("buildOpenApiDocFromRoutes()", () => {
  test("builds paths, parameters and requestBody", () => {
    const routes = [
      {
        method: "GET",
        path: "/users/:id",
        file: "routes/users.js",
        middlewares: ["auth"],
        queryParams: ["expand"],
        bodyParams: [],
        responses: ["200", "404"],
      },
      {
        method: "POST",
        path: "/users",
        file: "routes/users.js",
        middlewares: [],
        queryParams: [],
        bodyParams: ["name", "email"],
        responses: ["201"],
      },
    ];

    const doc = buildOpenApiDocFromRoutes(routes, {
      title: "Test",
      version: "0.0.1",
      serverUrl: "http://localhost:9999",
      descriptionByRouteFile: true,
    });

    expect(doc.openapi).toBe("3.0.3");
    expect(doc.info.title).toBe("Test");
    expect(doc.paths["/users/{id}"]).toBeTruthy();
    expect(doc.paths["/users/{id}"].get).toBeTruthy();

    const getOp = doc.paths["/users/{id}"].get;
    const paramNames = (getOp.parameters || []).map(p => p.name);
    expect(paramNames).toEqual(expect.arrayContaining(["id", "expand"]));
    expect(getOp.description).toMatch(/routes\/users\.js/);
    expect(getOp.description).toMatch(/Middlewares/i);

    const postOp = doc.paths["/users"].post;
    expect(postOp.requestBody).toBeTruthy();
    expect(postOp.responses["201"]).toBeTruthy();
  });
});
