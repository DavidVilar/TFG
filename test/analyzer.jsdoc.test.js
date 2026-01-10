const { buildJsdocFromRoutes } = require("../core/analyzer");

describe("buildJsdocFromRoutes()", () => {
  test("generates JSDoc blocks with route, params, middleware and returns", () => {
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
    ];

    const out = buildJsdocFromRoutes(routes);

    expect(out).toMatch(/@route GET \/users\/:id/);
    expect(out).toMatch(/@file routes\/users\.js/);
    expect(out).toMatch(/@middleware auth/);
    expect(out).toMatch(/@param \{string\} id path parameter/);
    expect(out).toMatch(/@param \{string\} expand query parameter/);
    expect(out).toMatch(/@returns \{object\} 200/);
    expect(out).toMatch(/@returns \{object\} 404/);
  });
});
