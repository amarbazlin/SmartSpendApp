const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  category: { type: String },
  amount: { type: Number, required: true },
  dateSpent: { type: Date, default: Date.now },
  paymentMethod: { type: String }
});

module.exports = mongoose.model("Expense", expenseSchema);
