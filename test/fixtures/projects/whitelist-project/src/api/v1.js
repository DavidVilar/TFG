const express = require("express");
const app = express();

app.get("/src-api", (req, res) => res.sendStatus(200));
