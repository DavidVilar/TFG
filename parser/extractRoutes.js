const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

function extractRoutesFromCode(code) {
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  const routes = [];

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;

      if (
        callee.type === "MemberExpression" &&
        ["get", "post", "put", "delete", "patch"].includes(callee.property.name)
      ) {
        const args = path.node.arguments;
        if (args.length > 0 && args[0].type === "StringLiteral") {
          routes.push({
            method: callee.property.name.toUpperCase(),
            path: args[0].value,
          });
        }
      }
    },
  });

  return routes;
}

function extractRoutesFromFile(inputPath) {
  const code = fs.readFileSync(inputPath, "utf-8");
  return extractRoutesFromCode(code);
}

function expressPathToOpenApiPath(p) {
  return p.replace(/:([^/]+)/g, "{$1}");
}

function extractPathParams(p) {
  const params = [];
  const regex = /:([^/]+)/g;
  let match;
  while ((match = regex.exec(p)) !== null) {
    params.push({
      name: match[1],
      in: "path",
      required: true,
      schema: { type: "string" },
    });
  }
  return params;
}

function buildOpenApiDocFromRoutes(routes) {
  const doc = {
    openapi: "3.0.3",
    info: { title: "API generada automàticament", version: "1.0.0" },
    servers: [{ url: "http://localhost:3000" }],
    paths: {},
  };

  for (const route of routes) {
    const oapiPath = expressPathToOpenApiPath(route.path);
    const method = route.method.toLowerCase();

    if (!doc.paths[oapiPath]) {
      doc.paths[oapiPath] = {};
    }

    doc.paths[oapiPath][method] = {
      summary: `${route.method} ${route.path}`,
      parameters: extractPathParams(route.path),
      responses: { "200": { description: "OK" } },
    };
  }

  return doc;
}

function buildJsdocFromRoutes(routes) {
  let out = "";
  for (const route of routes) {
    const params = extractPathParams(route.path);
    out += "/**\n";
    out += ` * @route ${route.method} ${route.path}\n`;
    out += ` * @summary ${route.method} ${route.path}\n`;
    for (const p of params) {
      out += ` * @param {string} ${p.name} path parameter\n`;
    }
    out += " * @returns {object} 200 - Successful response\n";
    out += " */\n\n";
  }
  return out;
}

if (require.main === module) {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  const format = process.argv[4] || "openapi";

  if (!inputPath || !outputPath) {
    console.error("Ús: node extractRoutes.js <fitxer.js> <sortida> [openapi|jsdoc]");
    process.exit(1);
  }

  const routes = extractRoutesFromFile(inputPath);

  if (format === "jsdoc") {
    const jsdocText = buildJsdocFromRoutes(routes);
    fs.writeFileSync(outputPath, jsdocText, "utf-8");
    console.log(`Blocs JSDoc generats i desats a ${outputPath}`);
  } else {
    const openApiDoc = buildOpenApiDocFromRoutes(routes);
    fs.writeFileSync(outputPath, JSON.stringify(openApiDoc, null, 2));
    console.log(`Document OpenAPI generat i desat a ${outputPath}`);
  }
}

module.exports = {
  extractRoutesFromFile,
  extractRoutesFromCode,
  buildOpenApiDocFromRoutes,
  buildJsdocFromRoutes,
  expressPathToOpenApiPath,
  extractPathParams,
};
