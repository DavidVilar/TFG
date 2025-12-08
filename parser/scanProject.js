const fs = require("fs");
const {
  analyzeProject,
  buildOpenApiDocFromRoutes,
} = require("../core/analyzer");

const projectRoot = process.argv[2];
const outputPath = process.argv[3];

if (!projectRoot || !outputPath) {
  console.error("Ús: node parser/scanProject.js <carpeta_projecte> <fitxer_sortida.json>");
  process.exit(1);
}

console.log(`Escanejant projecte a: ${projectRoot}`);

const result = analyzeProject(projectRoot);
const routes = result.routes;

console.log(`Fitxers de codi trobats: ${result.stats.totalSourceFiles}`);
console.log(`Fitxers amb possibles rutes d'API: ${result.stats.candidateFiles}`);
console.log(`Rutes totals detectades: ${result.stats.routesCount}`);

const openApiDoc = buildOpenApiDocFromRoutes(routes, {
  title: "API generada automàticament (projecte complet)",
  version: "1.0.0",
  serverUrl: "http://localhost:3000",
  descriptionByRouteFile: true,
});

fs.writeFileSync(outputPath, JSON.stringify(openApiDoc, null, 2));
console.log(`Document OpenAPI global generat i desat a ${outputPath}`);
