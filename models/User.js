const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 1000, min: 0 }, // Người chơi bắt đầu với 1000 tiền
});

module.exports = mongoose.model("User", UserSchema);
