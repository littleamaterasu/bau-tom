const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

// Định nghĩa mã lỗi rõ ràng
const ERROR_CODES = {
    USERNAME_EXISTS: { code: 400, message: "Username already exists" },
    USER_NOT_FOUND: { code: 404, message: "User not found" },
    INVALID_PASSWORD: { code: 401, message: "Invalid password" }
};

async function register(username, password) {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        throw ERROR_CODES.USERNAME_EXISTS;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    return { message: "User registered successfully" };
}

async function login(username, password) {
    const user = await User.findOne({ username });
    if (!user) {
        throw ERROR_CODES.USER_NOT_FOUND;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw ERROR_CODES.INVALID_PASSWORD;
    }

    const token = jwt.sign(
        { userId: user._id, username },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    return { token, username };
}

module.exports = { register, login, ERROR_CODES };
