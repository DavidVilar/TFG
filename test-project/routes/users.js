const express = require("express");
const router = express.Router();

router.get("/users", (req, res) => {});
router.post("/users", (req, res) => {});
router.get("/users/:id", (req, res) => {});
router.delete("/users/:id", (req, res) => {});


const BASE = "/api";
const USERS = "/users";
const USER_ID = "/users/:id";
const API_PREFIX = "/v1";

router.get(BASE + USERS, (req, res) => {});

router.get(BASE + USER_ID, (req, res) => {});

router.get(`${API_PREFIX}${USERS}`, (req, res) => {});

router.get(`${API_PREFIX}${USER_ID}`, (req, res) => {});

const NESTED = "/nested";
router.get(BASE + API_PREFIX + USERS + NESTED, (req, res) => {});


function getBaseFromConfig() {
  return process.env.API_BASE || "/config";
}

const dynamicBase = getBaseFromConfig();

router.get(dynamicBase + "/runtime", (req, res) => {});

function makeRoute(segment) {
  return "/fn" + segment;
}

router.get(makeRoute("/users"), (req, res) => {});

const methods = ["get", "post"];
router[methods[0]]("/array-method", (req, res) => {});

module.exports = router;
