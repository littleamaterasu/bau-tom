const { rollDice } = require('./diceService');
const User = require("../models/User"); // Import model User

const rooms = {}; // Lưu danh sách phòng
const diceHistory = {}; // Lưu lịch sử xúc sắc của mỗi phòng
const INTERVAL_TIME = 40000; // 40 giây

function createRoom(roomId) {
    if (rooms[roomId]) {
        return { success: false, message: "Room ID already exists." };
    }

    rooms[roomId] = {
        players: [],
    };

    diceHistory[roomId] = []; // Lịch sử xúc sắc

    // Tự động lăn xúc sắc mỗi 40 giây
    rooms[roomId].interval = setInterval(() => {
        const diceResult = rollDice();
        diceHistory[roomId].push(diceResult);
        console.log(`Room ${roomId} rolled dice: ${diceResult}`);
    }, INTERVAL_TIME);

    return { success: true, message: "Room created successfully." };
}

async function joinRoom(roomId, playerId) {
    if (!rooms[roomId]) {
        return { success: false, message: "Room does not exist." };
    }

    if (rooms[roomId].players.some(player => player._id.toString() === playerId)) {
        return { success: false, message: "Player already in room." };
    }

    if (rooms[roomId].players.length >= 8) {
        return { success: false, message: "Room is full." };
    }

    // Lấy thông tin người chơi từ MongoDB
    const player = await User.findById(playerId).select("username money");
    if (!player) {
        return { success: false, message: "Player not found." };
    }

    rooms[roomId].players.push(player); // Lưu cả thông tin username, money
    return { success: true, message: "Player joined the room.", player };
}

function leaveRoom(roomId, playerId) {
    if (!rooms[roomId]) {
        return { success: false, message: "Room does not exist." };
    }

    const index = rooms[roomId].players.indexOf(playerId);
    if (index === -1) {
        return { success: false, message: "Player not in room." };
    }

    rooms[roomId].players.splice(index, 1);

    // Xóa phòng nếu không còn ai
    if (rooms[roomId].players.length === 0) {
        delete rooms[roomId];
    }

    return { success: true, message: "Player left the room." };
}

function getRoomList() {
    return Object.keys(rooms);
}

function getRoomPlayers(roomId) {
    return rooms[roomId] ? rooms[roomId].players : [];
}

module.exports = { createRoom, joinRoom, leaveRoom, getRoomList, getRoomPlayers };
