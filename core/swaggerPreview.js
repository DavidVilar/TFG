const express = require("express");
const swaggerUiDist = require("swagger-ui-dist");
const getPortImport = require("get-port");

const getPort = getPortImport.default ?? getPortImport;

async function startSwaggerPreview(getOpenApiDoc) {
  const app = express();

  const preferredPorts = Array.from({ length: 1000 }, (_, i) => 41000 + i);
  const port = await getPort({ port: preferredPorts });

  app.get("/openapi.json", (_req, res) => {
    try {
      const doc = getOpenApiDoc();
      if (!doc) return res.status(400).json({ error: "No OpenAPI doc available" });
      res.json(doc);
    } catch (e) {
      res.status(500).json({ error: "Failed to build OpenAPI doc" });
    }
  });

  const swaggerPath = swaggerUiDist.getAbsoluteFSPath();
  app.use("/swagger-ui", express.static(swaggerPath));

  app.get("/swagger", (_req, res) => {
    res.type("html").send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Swagger Preview</title>
    <link rel="stylesheet" href="/swagger-ui/swagger-ui.css" />
    <style>
      body { margin: 0; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>

    <script src="/swagger-ui/swagger-ui-bundle.js"></script>
    <script src="/swagger-ui/swagger-ui-standalone-preset.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout"
      });
    </script>
  </body>
</html>`);
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(port, "127.0.0.1", () => resolve(s));
  });

  return {
    url: `http://127.0.0.1:${port}/swagger`,
    stop: () => new Promise((resolve) => server.close(resolve)),
  };
}

module.exports = { startSwaggerPreview };
