require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { register, login } = require("./services/authService");
const { rollDice } = require("./services/diceService");
const { createRoom, joinRoom, leaveRoom, getRoomList, getRoomPlayers } = require("./services/roomService");
const socketIo = require("socket.io");

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
    });

    // vào phòng
    socket.on("join_room", (roomId) => {
        joinRoom(roomId, socket.id);
        socket.join(roomId);
        io.to(roomId).emit("room_players", getRoomPlayers(roomId));
    });

    // rời phòng
    socket.on("leave_room", (roomId) => {
        leaveRoom(roomId, socket.id);
        socket.leave(roomId);
        io.emit("room_list", getRoomList());
    });

    // lăn xúc sắc cho các phòng
    socket.on("rolling_dice", ({ roomId, currentFace }) => {
        if (!roomId || !io.sockets.adapter.rooms.get(roomId)) {
            socket.emit("error", "Room does not exist");
            return;
        }

        const result = rollDice(currentFace);
        io.to(roomId).emit("dice_result", result);
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});
