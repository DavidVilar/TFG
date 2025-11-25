const fs = require("fs");
const path = require("path");
const {
  extractRoutesFromFile,
  buildOpenApiDocFromRoutes,
} = require("./extractRoutes");

const projectRoot = process.argv[2];
const outputPath = process.argv[3];

if (!projectRoot || !outputPath) {
  console.error("Ús: node parser/scanProject.js <carpeta_projecte> <fitxer_sortida.json>");
  process.exit(1);
}

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

// Comprueba si el fichero tiene rutas.
function fileLooksLikeApi(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const httpMethodRegex = /\.(get|post|put|delete|patch)\s*\(/;
  return httpMethodRegex.test(content);
}

console.log(`Escanejant projecte a: ${projectRoot}`);

const allSourceFiles = collectSourceFiles(projectRoot);
console.log(`Fitxers de codi trobats: ${allSourceFiles.length}`);

const candidateFiles = allSourceFiles.filter(fileLooksLikeApi);
console.log(`Fitxers amb possibles rutes d'API: ${candidateFiles.length}`);

if (candidateFiles.length === 0) {
  console.warn("No s'han trobat fitxers amb rutes d'API.");
}

let allRoutes = [];

for (const file of candidateFiles) {
  const routes = extractRoutesFromFile(file);
  if (routes.length > 0) {
    console.log(`  ➜ ${file} -> ${routes.length} rutes`);
    const withFile = routes.map((r) => ({
      ...r,
      file: path.relative(projectRoot, file),
    }));
    allRoutes = allRoutes.concat(withFile);
  }
}

if (allRoutes.length === 0) {
  console.warn("⚠ No s'han trobat rutes d'API després d'analitzar els fitxers candidates.");
}

// Construir OpenAPI con todas las rutas del proyecto
const openApiDoc = buildOpenApiDocFromRoutes(allRoutes, {
  title: "API generada automàticament (projecte complet)",
  version: "1.0.0",
  serverUrl: "http://localhost:3000",
  descriptionByRouteFile: true,
});

// Escriure a fitxer
fs.writeFileSync(outputPath, JSON.stringify(openApiDoc, null, 2));
console.log(`Document OpenAPI global generat i desat a ${outputPath}`);
