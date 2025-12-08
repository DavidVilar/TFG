const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const path = require("path");

function evaluateToString(node, env) {
  if (!node) return null;

  if (node.type === "StringLiteral") {
    return node.value;
  }

  if (node.type === "Identifier") {
    return typeof env[node.name] === "string" ? env[node.name] : null;
  }

  if (node.type === "BinaryExpression" && node.operator === "+") {
    const left = evaluateToString(node.left, env);
    const right = evaluateToString(node.right, env);
    if (typeof left === "string" && typeof right === "string") {
      return left + right;
    }
    return null;
  }

  if (node.type === "TemplateLiteral") {
    let result = "";
    for (let i = 0; i < node.quasis.length; i++) {
      result += node.quasis[i].value.cooked || "";
      if (i < node.expressions.length) {
        const exprVal = evaluateToString(node.expressions[i], env);
        if (typeof exprVal !== "string") return null;
        result += exprVal;
      }
    }
    return result;
  }

  return null;
}

function buildStringEnv(ast) {
  const env = {};
  traverse(ast, {
    VariableDeclarator(path) {
      if (path.node.id.type !== "Identifier") return;
      const name = path.node.id.name;
      const init = path.node.init;
      const val = evaluateToString(init, env);
      if (typeof val === "string") {
        env[name] = val;
      }
    },
  });
  return env;
}

function extractRoutesFromCode(code) {
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  const env = buildStringEnv(ast);
  const routes = [];

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;

      if (
        callee.type === "MemberExpression" &&
        ["get", "post", "put", "delete", "patch"].includes(callee.property.name)
      ) {
        const args = path.node.arguments;
        if (args.length === 0) return;
        const rawArg = args[0];

        const resolved = evaluateToString(rawArg, env);
        if (typeof resolved === "string") {
          routes.push({
            method: callee.property.name.toUpperCase(),
            path: resolved,
          });
        } else {
          console.warn(
            "Ruta no avaluada de manera estàtica:",
            callee.property.name.toUpperCase(),
            "argument tipus",
            rawArg.type
          );
        }
      }
    },
  });

  return routes;
}

// Añade el campo file para poder saber de dónde viene cada ruta
function extractRoutesFromFile(inputPath) {
  const code = fs.readFileSync(inputPath, "utf-8");
  const routes = extractRoutesFromCode(code);
  return routes.map((r) => ({
    ...r,
    file: inputPath,
  }));
}

// Modelo simplificado para la futura interfaz gráfica (MVP)
function analyzeFile(inputPath) {
  const routes = extractRoutesFromFile(inputPath);
  return {
    file: inputPath,
    endpoints: routes.map((route) => ({
      method: route.method,
      path: route.path,
      file: route.file,
    })),
  };
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

// Ahora acepta también un objeto options (como usas en scanProject)
function buildOpenApiDocFromRoutes(routes, options = {}) {
  const {
    title = "API generada automàticament",
    version = "1.0.0",
    serverUrl = "http://localhost:3000",
    descriptionByRouteFile = false,
  } = options;

  const doc = {
    openapi: "3.0.3",
    info: {
      title,
      version,
    },
    servers: [{ url: serverUrl }],
    paths: {},
  };

  for (const route of routes) {
    const oapiPath = expressPathToOpenApiPath(route.path);
    const method = route.method.toLowerCase();

    if (!doc.paths[oapiPath]) {
      doc.paths[oapiPath] = {};
    }

    const summary = `${route.method} ${route.path}`;
    const op = {
      summary,
      parameters: extractPathParams(route.path),
      responses: { "200": { description: "OK" } },
    };

    if (descriptionByRouteFile && route.file) {
      op.description = `Definit a ${route.file}`;
    }

    doc.paths[oapiPath][method] = op;
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

function analyzeProject(projectRoot) {
  function collectSourceFiles(dir) {
    const files = [];

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        files.push(...collectSourceFiles(fullPath));
      } else if (entry.isFile()) {
        if (fullPath.endsWith(".js") || fullPath.endsWith(".ts")) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  function fileLooksLikeApi(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const httpMethodRegex = /\.(get|post|put|delete|patch)\s*\(/;
    return httpMethodRegex.test(content);
  }

  const allSourceFiles = collectSourceFiles(projectRoot);
  const candidateFiles = allSourceFiles.filter(fileLooksLikeApi);

  let routes = [];

  for (const file of candidateFiles) {
    const fileRoutes = extractRoutesFromFile(file);
    const withRelFile = fileRoutes.map((r) => ({
      ...r,
      file: path.relative(projectRoot, file),
    }));
    routes = routes.concat(withRelFile);
  }

  return {
    projectRoot,
    stats: {
      totalSourceFiles: allSourceFiles.length,
      candidateFiles: candidateFiles.length,
      routesCount: routes.length,
    },
    routes,
  };
}

module.exports = {
  evaluateToString,
  buildStringEnv,
  extractRoutesFromCode,
  extractRoutesFromFile,
  analyzeFile,
  analyzeProject,
  buildOpenApiDocFromRoutes,
  buildJsdocFromRoutes,
  expressPathToOpenApiPath,
  extractPathParams,
};