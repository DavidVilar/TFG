{
  "openapi": "3.0.3",
  "info": {
    "title": "API generada automàticament (projecte complet)",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "http://localhost:3000"
    }
  ],
  "paths": {
    "/status": {
      "get": {
        "summary": "GET /status",
        "parameters": [],
        "responses": {
          "200": {
            "description": "OK"
          }
        },
        "description": "Definit a index.js"
      }
    },
    "/admin/dashboard": {
      "get": {
        "summary": "GET /admin/dashboard",
        "parameters": [],
        "responses": {
          "200": {
            "description": "OK"
          }
        },
        "description": "Definit a routes\\admin.js"
      }
    },
    "/users": {
      "get": {
        "summary": "GET /users",
        "parameters": [],
        "responses": {
          "200": {
            "description": "OK"
          }
        },
        "description": "Definit a routes\\users.js"
      },
      "post": {
        "summary": "POST /users",
        "parameters": [],
        "responses": {
          "200": {
            "description": "OK"
          }
        },
        "description": "Definit a routes\\users.js"
      }
    },
    "/users/{id}": {
      "get": {
        "summary": "GET /users/:id",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        },
        "description": "Definit a routes\\users.js"
      },
      "delete": {
        "summary": "DELETE /users/:id",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        },
        "description": "Definit a routes\\users.js"
      }
    },
    "/api/users": {
      "get": {
        "summary": "GET /api/users",
        "parameters": [],
        "responses": {
          "200": {
            "description": "OK"
          }
        },
        "description": "Definit a routes\\users.js"
      }
    },
    "/api/users/{id}": {
      "get": {
        "summary": "GET /api/users/:id",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        },
        "description": "Definit a routes\\users.js"
      }
    },
    "/v1/users": {
      "get": {
        "summary": "GET /v1/users",
        "parameters": [],
        "responses": {
          "200": {
            "description": "OK"
          }
        },
        "description": "Definit a routes\\users.js"
      }
    },
    "/v1/users/{id}": {
      "get": {
        "summary": "GET /v1/users/:id",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        },
        "description": "Definit a routes\\users.js"
      }
    },
    "/api/v1/users/nested": {
      "get": {
        "summary": "GET /api/v1/users/nested",
        "parameters": [],
        "responses": {
          "200": {
            "description": "OK"
          }
        },
        "description": "Definit a routes\\users.js"
      }
    }
  }
}