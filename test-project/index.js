const express = require("express");
const app = express();

app.get("/status", (req, res) => res.send("OK"));

app.listen(3000);