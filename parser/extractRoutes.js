const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

// Rutes rebudes com arguments
const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error("Ús: node parser/extractRoutes.js <fitxer_entrada.js> <fitxer_sortida.json>");
  process.exit(1);
}

// Lectura de fitxer
const code = fs.readFileSync(inputPath, "utf-8");

// Parseja el codi a AST
const ast = parser.parse(code, {
  sourceType: "module",
  plugins: ["jsx", "typescript"],
});

// Analisis del codi i extracció de les rutes
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

// Escritura a fitxer JSON
fs.writeFileSync(outputPath, JSON.stringify(routes, null, 2));
console.log(`✅ Rutes trobades i desades a ${outputPath}`);