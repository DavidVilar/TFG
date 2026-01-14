const express = require("express");
const router = express.Router();

function auth(req, res, next) { next(); }
function rateLimit() { return (req, res, next) => next(); }

router.get("/admin/dashboard", auth, rateLimit(), (req, res) => {
  const page = req.query.page;
  const filter = req.query["filter"];

  const { role, enabled } = req.body;

  if (!enabled) return res.sendStatus(403);
  return res.status(200).send("OK");
});

router.put("/admin/users/:id", auth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.sendStatus(400);
  return res.status(204).send();
});

router.patch("/admin/users/:id", auth, (req, res) => {
  const { op } = req.body;
  if (op === "disable") return res.sendStatus(202);
  return res.status(200).send();
});

module.exports = router;
