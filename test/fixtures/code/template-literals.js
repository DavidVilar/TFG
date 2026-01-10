const express = require("express");
const app = express();

const BASE = "/api";
app.get(`${BASE}/cars`, (req, res) => res.sendStatus(200));
