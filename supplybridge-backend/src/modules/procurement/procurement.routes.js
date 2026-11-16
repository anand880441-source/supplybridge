const express = require("express");

const {
  getProcurementPolicy
} = require("./procurement.controller");

const router = express.Router();

router.get("/policy", getProcurementPolicy);

module.exports = router;
