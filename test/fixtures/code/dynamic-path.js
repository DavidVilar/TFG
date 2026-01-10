const express = require("express");
const app = express();

function getPath() { return "/nope"; }
app.get(getPath(), (req, res) => res.sendStatus(200));
