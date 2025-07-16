const mongoose = require("mongoose");

const incomeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  source: { type: String },
  amount: { type: Number, required: true },
  dateReceived: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Income", incomeSchema);
