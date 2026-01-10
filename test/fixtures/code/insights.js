const express = require("express");
const app = express();

app.get("/search", (req, res) => {
  const { page } = req.query;
  const q = req.query["q"];
  return res.status(204).send();
});

app.post("/users/:id", (req, res) => {
  const { name } = req.body;
  const email = req.body.email;
  if (!name) return res.sendStatus(400);
  return res.status(201).json({ id: req.params.id, name, email });
});
