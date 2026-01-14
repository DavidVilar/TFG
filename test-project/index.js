const express = require("express");
const app = express();
const router = express.Router();

const API = "/api";
const V1 = "/v1";

app.get("/status", (req, res) => res.send("OK"));

router.get(API + "/health", (req, res) => res.sendStatus(200));
router.delete(`${API}${V1}/sessions/:id`, (req, res) => res.sendStatus(204));

app.use(router);

app.listen(3000);
