const fs = require("fs");
const {
  extractRoutesFromFile,
  buildOpenApiDocFromRoutes,
  buildJsdocFromRoutes,
} = require("../core/analyzer");

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
