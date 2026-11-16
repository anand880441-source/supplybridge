const express = require("express");

const authMiddleware = require("../../middleware/authMiddleware");
const { getWallet, topUp } = require("./wallet.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getWallet);
router.post("/top-up", topUp);

module.exports = router;
