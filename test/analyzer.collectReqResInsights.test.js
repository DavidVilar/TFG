const fs = require("fs");
const path = require("path");
const { extractRoutesFromCode } = require("../core/analyzer");

describe("collectReqResInsights (via extractRoutesFromCode)", () => {
  test("detects query/body params + status codes", () => {
    const code = fs.readFileSync(
      path.join(__dirname, "fixtures", "code", "insights.js"),
      "utf-8"
    );

    const routes = extractRoutesFromCode(code);
    expect(routes).toHaveLength(2);

    const search = routes.find(r => r.path === "/search");
    expect(search).toBeTruthy();
    expect(search.queryParams.sort()).toEqual(["page", "q"].sort());
    expect(search.bodyParams).toEqual([]);
    expect(search.responses).toContain("204");

    const post = routes.find(r => r.path === "/users/:id");
    expect(post).toBeTruthy();
    expect(post.bodyParams.sort()).toEqual(["name", "email"].sort());
    expect(post.responses).toEqual(expect.arrayContaining(["201", "400"]));
  });
});
