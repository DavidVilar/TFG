// parser/extractRoutes.js
const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

// Rutes rebudes com arguments
const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error("❌ Ús: node parser/extractRoutes.js <fitxer_entrada.js> <fitxer_sortida.json>");
  process.exit(1);
}

// 1️⃣ Llegeix el fitxer d'entrada
const code = fs.readFileSync(inputPath, "utf-8");

// 2️⃣ Parseja el codi a AST
const ast = parser.parse(code, {
  sourceType: "module",
  plugins: ["jsx", "typescript"],
});

// 3️⃣ Analitza el codi i extreu rutes
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

// 4️⃣ Escriu la sortida a fitxer JSON
fs.writeFileSync(outputPath, JSON.stringify(routes, null, 2));
console.log(`✅ Rutes trobades i desades a ${outputPath}`);