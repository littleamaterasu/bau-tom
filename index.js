require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { register, login } = require("./services/authService");
const { createRoom, joinRoom, leaveRoom, getRoomList, getRoomPlayers, gamble, gambleResult, diceHistory, rooms } = require("./services/roomService");
const { rollDice } = require('./services/diceService');
const { WebSocketServer } = require("ws");

const INTERVAL_TIME = 15000;

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

const wss = new WebSocketServer({ server });
const clients = new Map();
const clientInfo = new Map(); // Lưu { ws: { username, roomId } }

// interval của các room
const roomInterval = {};

wss.on("connection", (ws) => {
    console.log("User connected");

    ws.send(JSON.stringify({ eventName: "room_list", data: getRoomList() }));

    ws.on("message", async (message) => {
        try {
            const { eventName, data } = JSON.parse(message);
            console.log(eventName, data)
            switch (eventName) {
                case "create_room":
                    createRoom(data.roomId);
                    broadcast({ eventName: "room_list", data: getRoomList() });

                    // để cho interval là của cả server
                    roomInterval[data.roomId] = setInterval(async () => {
                        const result = rollDice(diceHistory[data.roomId] ? diceHistory[data.roomId].face : 1);
                        const gamblingResult = await gambleResult(data.roomId, result);
                        broadcastToRoom(data.roomId, { eventName: "dice_result", data: result });
                        broadcastToRoom(data.roomId, { eventName: "room_players", data: getRoomPlayers(data.roomId) });
                    }, INTERVAL_TIME);
                    break;

                case "join_room":
                    const joinRoomResult = await joinRoom(data.roomId, data.username);
                    if (joinRoomResult.success) {

                        clients.set(ws, data.roomId);
                        ws.send(JSON.stringify({
                            eventName: "join_room_success",
                            data: {
                                username: data.username,
                                roomId: data.roomId
                            }
                        }))
                        clientInfo.set(ws, { username: data.username, roomId: data.roomId });
                        broadcast({ eventName: "room_list", data: getRoomList() });
                        broadcastToRoom(data.roomId, { eventName: "room_players", data: getRoomPlayers(data.roomId) });
                    }
                    break;

                case "leave_room":
                    const leaveRoomResult = leaveRoom(data.roomId, data.username);

                    // xử lý khi thực hiện rời thành công
                    if (leaveRoomResult.success) {
                        console.log('leave room success')
                        // xóa interval nếu phòng bị xóa
                        if (!rooms[data.roomId]) {
                            clearInterval(roomInterval[data.roomId]);
                        }

                        // đặt lại trong map
                        clientInfo.delete(ws);

                        // thông báo rời thành công
                        ws.send(
                            JSON.stringify(
                                {
                                    eventName: "leave_room_success",
                                    data: ""
                                }))
                        clients.delete(ws);
                        if (getRoomList() !== null) {
                            broadcast({ eventName: "room_list", data: getRoomList() });
                        }
                    }
                    break;

                case "gamble":
                    const gambleRequestResult = await gamble(data.roomId, data.username, parseInt(data.amount), parseInt(data.option));
                    if (gambleRequestResult.success) {
                        ws.send(
                            JSON.stringify({
                                eventName: "gameble_success"
                            }));

                        broadcastToRoom(data.roomId, { eventName: "room_players", data: getRoomPlayers(data.roomId) });
                    } else {
                        console.log(gambleRequestResult.message)
                    }
                    break;
            }
        } catch (err) {
            ws.send(JSON.stringify({ eventName: "error", data: err.message }));
        }
    });

    ws.on("close", () => {
        const userData = clientInfo.get(ws);
        if (userData && userData.username !== '' && userData.roomId !== '') {
            const result = leaveRoom(userData.roomId, userData.username);
            clientInfo.delete(ws);
            if (getRoomPlayers(userData.roomId) === null) {
                clearInterval(roomInterval[userData.roomId]);
            }
        }
        clients.delete(ws);
        broadcast({ eventName: "room_list", data: getRoomList() });
        console.log("User disconnected");
    });
});

function broadcast(message) {
    console.log('broadcast', message)
    wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

function broadcastToRoom(roomId, message) {
    console.log('broadcast', roomId, message)
    wss.clients.forEach(client => {
        if (clients.get(client) === roomId && client.readyState === client.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// ======= Express API =======
app.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        const response = await register(username, password);
        res.status(201).json(response);
    } catch (err) {
        res.status(400).json(err);
    }
});

app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const response = await login(username, password);
        res.status(200).json(response);
    } catch (err) {
        res.status(400).json(err);
    }
});
