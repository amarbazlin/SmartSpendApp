const express = require("express");
const router = express.Router();
const incomeController = require("../controllers/incomeController");

router.post("/", incomeController.createIncome);
router.get("/:userId", incomeController.getUserIncome);

module.exports = router;
