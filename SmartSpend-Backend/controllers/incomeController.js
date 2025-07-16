const Income = require("../models/Income");

exports.createIncome = async (req, res) => {
  try {
    const income = new Income(req.body);
    await income.save();
    res.status(201).json(income);
  } catch (err) {
    res.status(500).json({ error: "Failed to save income" });
  }
};

exports.getUserIncome = async (req, res) => {
  try {
    const incomes = await Income.find({ userId: req.params.userId });
    res.json(incomes);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch income" });
  }
};
