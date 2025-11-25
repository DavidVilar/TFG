const express = require("express");
const router = express.Router();

router.get("/users", (req, res) => {});
router.post("/users", (req, res) => {});
router.get("/users/:id", (req, res) => {});
router.delete("/users/:id", (req, res) => {});

module.exports = router;