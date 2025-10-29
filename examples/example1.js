const express = require("express");
const router = express.Router();

router.get("/users", (req, res) => {});
router.post("/login", loginController);
router.delete("/account/:id", deleteAccount);
