require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { register, login } = require("./services/authService");
const { createRoom, joinRoom, leaveRoom, getRoomList, getRoomPlayers, gamble, gambleResult, diceHistory } = require("./services/roomService");
const { rollDice } = require('./services/diceService');
const socketIo = require("socket.io");

const INTERVAL_TIME = 40000; // 40 giây

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error(err));

const app = express();
app.use(cors());
app.use(express.json());

const server = app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});

const io = socketIo(server, {
    cors: {
        origin: "*",
    },
});

// ======= Express API =======
// Đăng ký
app.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        const response = await register(username, password);
        res.status(201).json(response);
    } catch (err) {
        res.status(400).json(err);
    }
});

// Đăng nhập
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const response = await login(username, password);
        res.status(200).json(response);
    } catch (err) {
        res.status(400).json(err);
    }
});

// ======= Socket.IO =======
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // trả về danh sách các phòng đang có
    io.emit("room_list", getRoomList());

    // tạo phòng mới
    socket.on("create_room", (roomId) => {
        createRoom(roomId);
        socket.join(roomId);
        io.emit("room_list", getRoomList());

        setInterval(() => {
            result = rollDice(diceHistory[roomId] ? diceHistory[roomId].face : 1);
            io.to(roomId).emit("dice_result", result);
            gambleResult(roomId, result);
            io.to(roomId).emit("room_players", getRoomPlayers(roomId));
        }, INTERVAL_TIME)
    });

    // vào phòng
    socket.on("join_room", async (roomId, username) => {
        try {
            await joinRoom(roomId, username); // Thêm username vào phòng
            socket.join(roomId);
            io.to(roomId).emit("room_players", getRoomPlayers(roomId)); // Gửi lại danh sách người chơi trong phòng
        } catch (err) {
            socket.emit("error", err.message);
        }
    });

    // rời phòng
    socket.on("leave_room", (roomId) => {
        leaveRoom(roomId, socket.id);
        socket.leave(roomId);
        io.emit("room_list", getRoomList());
    });

    // đặt cược
    socket.on("gamble", async (roomId, username, amount, option) => {
        await gamble(roomId, username, amount, option);
        io.to(roomId).emit("room_players", getRoomPlayers(roomId));
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});
