const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const path = require("path");

function evaluateToString(node, env) {
  if (!node) return null;

  if (node.type === "StringLiteral") return node.value;

  if (node.type === "Identifier") {
    return typeof env[node.name] === "string" ? env[node.name] : null;
  }

  if (node.type === "BinaryExpression" && node.operator === "+") {
    const left = evaluateToString(node.left, env);
    const right = evaluateToString(node.right, env);
    if (typeof left === "string" && typeof right === "string") return left + right;
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
    VariableDeclarator(p) {
      if (p.node.id.type !== "Identifier") return;
      const name = p.node.id.name;
      const init = p.node.init;
      const val = evaluateToString(init, env);
      if (typeof val === "string") env[name] = val;
    },
  });
  return env;
}


function isHttpRouteCall(callee) {
  return (
    callee &&
    callee.type === "MemberExpression" &&
    callee.property &&
    callee.property.type === "Identifier" &&
    ["get", "post", "put", "delete", "patch"].includes(callee.property.name)
  );
}

function nodeToName(node) {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression") {
    const obj = nodeToName(node.object);
    const prop =
      node.property?.type === "Identifier"
        ? node.property.name
        : node.property?.type === "StringLiteral"
          ? node.property.value
          : null;
    if (obj && prop) return `${obj}.${prop}`;
    return null;
  }
  return null;
}

function getHandlerFunctionsFromArgs(args) {
  const handlers = [];
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (
      a &&
      (a.type === "FunctionExpression" ||
        a.type === "ArrowFunctionExpression")
    ) {
      handlers.push(a);
    }
  }
  return handlers;
}

function getMiddlewaresFromArgs(args) {
  const mids = [];
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    const isInlineFn =
      a &&
      (a.type === "FunctionExpression" || a.type === "ArrowFunctionExpression");

    if (isInlineFn) continue;

    if (a.type === "CallExpression") {
      const calleeName = nodeToName(a.callee);
      mids.push(calleeName ? `${calleeName}()` : "anonymousCall()");
    } else {
      const name = nodeToName(a);
      if (name) mids.push(name);
    }
  }
  return mids;
}

function collectReqResInsights(handlerFn) {
  const queryParams = new Set();
  const bodyParams = new Set();
  const statusCodes = new Set();

  if (!handlerFn) {
    return {
      queryParams: [],
      bodyParams: [],
      responses: ["200"],
    };
  }

  const paramNames = handlerFn.params || [];
  const reqName =
    paramNames[0]?.type === "Identifier" ? paramNames[0].name : "req";
  const resName =
    paramNames[1]?.type === "Identifier" ? paramNames[1].name : "res";

  const bodyNode =
    handlerFn.body?.type === "BlockStatement"
      ? handlerFn.body
      : null;

  if (!bodyNode) {
    return {
      queryParams: [],
      bodyParams: [],
      responses: ["200"],
    };
  }

  traverse(
    { type: "File", program: { type: "Program", body: [bodyNode] } },
    {
      MemberExpression(p) {
        const n = p.node;

        if (
          n.object &&
          n.object.type === "MemberExpression" &&
          n.object.object?.type === "Identifier" &&
          n.object.object.name === reqName &&
          n.object.property?.type === "Identifier" &&
          n.object.property.name === "query"
        ) {
          if (n.property?.type === "Identifier") queryParams.add(n.property.name);
          if (n.property?.type === "StringLiteral") queryParams.add(n.property.value);
        }

        if (
          n.object &&
          n.object.type === "MemberExpression" &&
          n.object.object?.type === "Identifier" &&
          n.object.object.name === reqName &&
          n.object.property?.type === "Identifier" &&
          n.object.property.name === "body"
        ) {
          if (n.property?.type === "Identifier") bodyParams.add(n.property.name);
          if (n.property?.type === "StringLiteral") bodyParams.add(n.property.value);
        }
      },

      VariableDeclarator(p) {
        const n = p.node;
        if (n.id?.type !== "ObjectPattern") return;

        if (
          n.init?.type === "MemberExpression" &&
          n.init.object?.type === "Identifier" &&
          n.init.object.name === reqName &&
          n.init.property?.type === "Identifier" &&
          (n.init.property.name === "query" || n.init.property.name === "body")
        ) {
          const target = n.init.property.name;
          for (const prop of n.id.properties) {
            if (prop.type === "ObjectProperty") {
              const key = prop.key;
              const keyName =
                key.type === "Identifier"
                  ? key.name
                  : key.type === "StringLiteral"
                    ? key.value
                    : null;
              if (!keyName) continue;
              if (target === "query") queryParams.add(keyName);
              if (target === "body") bodyParams.add(keyName);
            }
          }
        }
      },

      CallExpression(p) {
        const n = p.node;

        if (
          n.callee?.type === "MemberExpression" &&
          n.callee.object?.type === "Identifier" &&
          n.callee.object.name === resName &&
          n.callee.property?.type === "Identifier" &&
          n.callee.property.name === "sendStatus"
        ) {
          const arg = n.arguments?.[0];
          if (arg?.type === "NumericLiteral") statusCodes.add(String(arg.value));
          else if (arg?.type === "StringLiteral") statusCodes.add(arg.value);
        }

        if (
          n.callee?.type === "MemberExpression" &&
          n.callee.object?.type === "Identifier" &&
          n.callee.object.name === resName &&
          n.callee.property?.type === "Identifier" &&
          n.callee.property.name === "status"
        ) {
          const arg = n.arguments?.[0];
          if (arg?.type === "NumericLiteral") statusCodes.add(String(arg.value));
          else if (arg?.type === "StringLiteral") statusCodes.add(arg.value);
        }
      },
    },
    undefined,
    undefined
  );

  const responses = statusCodes.size ? [...statusCodes] : ["200"];

  return {
    queryParams: [...queryParams],
    bodyParams: [...bodyParams],
    responses,
  };
}


function extractRoutesFromCode(code) {
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  const env = buildStringEnv(ast);
  const routes = [];

  traverse(ast, {
    CallExpression(p) {
      const callee = p.node.callee;

      if (!isHttpRouteCall(callee)) return;

      const methodName = callee.property.name.toUpperCase();
      const args = p.node.arguments;
      if (!args.length) return;

      const rawArg = args[0];
      const resolved = evaluateToString(rawArg, env);

      if (typeof resolved !== "string") {
        console.warn(
          "Ruta no avaluada de manera estàtica:",
          methodName,
          "argument tipus",
          rawArg?.type
        );
        return;
      }

      const middlewares = getMiddlewaresFromArgs(args);

      const handlerFns = getHandlerFunctionsFromArgs(args);
      const primaryHandler = handlerFns.length ? handlerFns[handlerFns.length - 1] : null;

      const insights = collectReqResInsights(primaryHandler);

      routes.push({
        method: methodName,
        path: resolved,
        middlewares,
        queryParams: insights.queryParams,
        bodyParams: insights.bodyParams,
        responses: insights.responses,
      });
    },
  });

  return routes;
}

function extractRoutesFromFile(inputPath) {
  const code = fs.readFileSync(inputPath, "utf-8");
  const routes = extractRoutesFromCode(code);
  return routes.map((r) => ({
    ...r,
    file: inputPath,
  }));
}

function analyzeFile(inputPath) {
  const routes = extractRoutesFromFile(inputPath);
  return {
    file: inputPath,
    endpoints: routes.map((route) => ({
      method: route.method,
      path: route.path,
      file: route.file,
      middlewares: route.middlewares || [],
      queryParams: route.queryParams || [],
      bodyParams: route.bodyParams || [],
      responses: route.responses || ["200"],
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

function buildQueryParams(route) {
  const q = Array.isArray(route.queryParams) ? route.queryParams : [];
  return q.map((name) => ({
    name,
    in: "query",
    required: false,
    schema: { type: "string" },
  }));
}

function buildRequestBody(route) {
  const b = Array.isArray(route.bodyParams) ? route.bodyParams : [];
  if (!b.length) return null;

  const properties = {};
  for (const name of b) properties[name] = { type: "string" };

  return {
    required: false,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties,
        },
      },
    },
  };
}

function buildResponses(route) {
  const codes = Array.isArray(route.responses) && route.responses.length
    ? route.responses
    : ["200"];

  const responses = {};
  for (const code of codes) {
    responses[String(code)] = { description: `HTTP ${code}` };
  }
  return responses;
}

function buildOpenApiDocFromRoutes(routes, options = {}) {
  const {
    title = "API generada automàticament",
    version = "1.0.0",
    serverUrl = "http://localhost:3000",
    descriptionByRouteFile = false,
  } = options;

  const doc = {
    openapi: "3.0.3",
    info: { title, version },
    servers: [{ url: serverUrl }],
    paths: {},
  };

  for (const route of routes) {
    const oapiPath = expressPathToOpenApiPath(route.path);
    const method = route.method.toLowerCase();

    if (!doc.paths[oapiPath]) doc.paths[oapiPath] = {};

    const summary = `${route.method} ${route.path}`;

    const parameters = [
      ...extractPathParams(route.path),
      ...buildQueryParams(route),
    ];

    const op = {
      summary,
      parameters,
      responses: buildResponses(route),
    };

    const rb = buildRequestBody(route);
    if (rb) op.requestBody = rb;

    if (descriptionByRouteFile && route.file) {
      const midTxt =
        route.middlewares && route.middlewares.length
          ? `\nMiddlewares: ${route.middlewares.join(", ")}`
          : "";
      op.description = `Definit a ${route.file}${midTxt}`;
    }

    doc.paths[oapiPath][method] = op;
  }

  return doc;
}

function buildJsdocFromRoutes(routes) {
  let out = "";
  for (const route of routes) {
    const pathParams = extractPathParams(route.path);
    const queryParams = Array.isArray(route.queryParams) ? route.queryParams : [];
    const bodyParams = Array.isArray(route.bodyParams) ? route.bodyParams : [];
    const responses = Array.isArray(route.responses) && route.responses.length ? route.responses : ["200"];
    const middlewares = Array.isArray(route.middlewares) ? route.middlewares : [];

    out += "/**\n";
    out += ` * @route ${route.method} ${route.path}\n`;
    out += ` * @summary ${route.method} ${route.path}\n`;
    if (route.file) out += ` * @file ${route.file}\n`;
    if (middlewares.length) out += ` * @middleware ${middlewares.join(", ")}\n`;

    for (const p of pathParams) out += ` * @param {string} ${p.name} path parameter\n`;
    for (const q of queryParams) out += ` * @param {string} ${q} query parameter\n`;
    for (const b of bodyParams) out += ` * @param {string} ${b} body parameter\n`;

    for (const code of responses) {
      out += ` * @returns {object} ${code} - HTTP ${code}\n`;
    }

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
        if (fullPath.endsWith(".js") || fullPath.endsWith(".ts")) files.push(fullPath);
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
