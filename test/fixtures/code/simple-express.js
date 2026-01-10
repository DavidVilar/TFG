const express = require("express");
const app = express();

app.get("/users", (req, res) => res.sendStatus(200));
app.post("/users", (req, res) => res.status(201).json({ ok: true }));
