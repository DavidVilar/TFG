const express = require("express");
const app = express();

app.get("/routes-only", (req, res) => res.sendStatus(200));
