const parser = require("@babel/parser");
const { evaluateToString, buildStringEnv } = require("../core/analyzer");

function parseExpr(expr) {
  const ast = parser.parse(`(${expr})`, { sourceType: "module" });
  return ast.program.body[0].expression;
}

describe("evaluateToString()", () => {
  test("StringLiteral", () => {
    const node = parseExpr('"hello"');
    expect(evaluateToString(node, {})).toBe("hello");
  });

  test("Identifier resolved from env", () => {
    const node = parseExpr("BASE");
    expect(evaluateToString(node, { BASE: "/api" })).toBe("/api");
  });

  test("BinaryExpression concatenation", () => {
    const node = parseExpr('"/api" + "/users"');
    expect(evaluateToString(node, {})).toBe("/api/users");
  });

  test("BinaryExpression with env identifiers", () => {
    const node = parseExpr("BASE + SUF");
    expect(evaluateToString(node, { BASE: "/api", SUF: "/v1" })).toBe("/api/v1");
  });

  test("TemplateLiteral", () => {
    const node = parseExpr("`${BASE}/cars`");
    expect(evaluateToString(node, { BASE: "/api" })).toBe("/api/cars");
  });

  test("Returns null for non-string parts", () => {
    const node = parseExpr("BASE + 5");
    expect(evaluateToString(node, { BASE: "/api" })).toBeNull();
  });
});

describe("buildStringEnv()", () => {
  test("extracts simple const strings", () => {
    const ast = parser.parse('const BASE="/api"; const X=BASE;', { sourceType: "module" });
    const env = buildStringEnv(ast);
    expect(env.BASE).toBe("/api");
    expect(env.X).toBe("/api");
  });
});
