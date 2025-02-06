const User = require("../models/User"); // Import model User

const rooms = {}; // Lưu danh sách phòng
const diceHistory = {}; // Lưu lịch sử xúc sắc của mỗi phòng

// Hàm tạo phòng
function createRoom(roomId) {
    if (rooms[roomId]) {
        return { success: false, message: "ID phòng đã tồn tại." };
    }

    rooms[roomId] = {
        players: [],
        playersOption: {}
    };

    diceHistory[roomId] = []; // Lịch sử xúc sắc

    return { success: true, message: "Phòng đã được tạo thành công." };
}

// Hàm đặt cược
async function gamble(roomId, username, amount, option) {
    // Kiểm tra số tiền có phải là số hợp lệ không
    if (isNaN(amount) || amount <= 0) {
        return { success: false, message: "Số tiền cược không hợp lệ. Vui lòng nhập số tiền hợp lệ." };
    }

    // Kiểm tra tùy chọn xúc sắc có hợp lệ không
    const validDiceFaces = [1, 2, 3, 4, 5, 6];
    if (!validDiceFaces.includes(option)) {
        return { success: false, message: "Tùy chọn xúc sắc không hợp lệ. Vui lòng chọn một mặt từ 1 đến 6." };
    }

    const player = rooms[roomId].players.find(player => player.username === username);

    if (!player) {
        return { success: false, message: "Không tìm thấy người chơi trong phòng" };
    }

    const balance = player.balance;
    rooms[roomId].playersOption[username] = { option: option, amount: amount };

    if (balance < amount) {
        return { success: false, message: "Không đủ tiền" };
    }

    player.balance -= amount;

    try {
        const playerInDb = await User.findOne({ username: player.username });
        if (!playerInDb) {
            throw new Error("Không tìm thấy người chơi trong cơ sở dữ liệu");
        }

        playerInDb.balance = player.balance;

        await playerInDb.save();

        return {
            success: true,
            message: `Đặt cược thành công, người chơi ${player.username} còn lại ${player.balance}`,
        };
    } catch (err) {
        console.error(err);
        return { success: false, message: "Lỗi khi cập nhật cơ sở dữ liệu" };
    }
}

// Hàm kết quả
async function gambleResult(roomId, diceResult) {
    if (!diceResult || !diceResult.face || ![1, 2, 3, 4, 5, 6].includes(diceResult.face)) {
        return { success: false, message: "Kết quả xúc sắc không hợp lệ. Mặt xúc sắc phải là một số từ 1 đến 6." };
    }

    const room = rooms[roomId];
    diceHistory[roomId].push(diceResult);
    room.players.forEach(async (player) => {
        if (room.playersOption[player.username].option === diceResult.face) {
            player.balance += 2 * room.playersOption[player.username].amount;
            try {
                const playerInDb = await User.findOne({ username: player.username });
                if (!playerInDb) {
                    throw new Error("Không tìm thấy người chơi trong cơ sở dữ liệu");
                }

                playerInDb.balance = player.balance;

                await playerInDb.save();

                return {
                    success: true,
                    message: `Đã thắng cược! Người chơi ${player.username} còn lại ${player.balance}`,
                    player: playerInDb
                };
            } catch (err) {
                console.error(err);
                return { success: false, message: "Lỗi khi cập nhật cơ sở dữ liệu" };
            }
        }
        room.playersOption[player.username] = { option: 0, amount: 0 };
    });
}

// Hàm tham gia phòng
async function joinRoom(roomId, playerId) {
    roomId = roomId.toString();

    // kiểm tra id phòng
    if (!rooms[roomId]) {
        return { success: false, message: "Phòng không tồn tại." };
    }

    // kiểm tra đã có trong phòng chưa
    if (rooms[roomId].players.some(player => player.username.toString() === playerId)) {
        return { success: false, message: "Người chơi đã có trong phòng." };
    }

    if (rooms[roomId].players.length >= 8) {
        return { success: false, message: "Phòng đã đầy." };
    }

    // Lấy thông tin người chơi từ MongoDB
    const player = await User.findOne({ username: playerId })
        .then(user => {
            if (!user) {
                throw new Error("Không tìm thấy người chơi");
            }

            return user;
        })
        .catch(err => {
            console.error(err);
            throw new Error("Đã xảy ra lỗi khi tham gia phòng");
        });

    if (!player) {
        return { success: false, message: "Không tìm thấy người chơi." };
    }

    console.log('Người chơi mới vào phòng', roomId, 'là', player.username);

    rooms[roomId].players.push({
        username: player.username,
        balance: player.balance
    }); // Lưu cả thông tin username, balance
    rooms[roomId].playersOption[player.username] = { option: 0, amount: 0 };
    console.log('Danh sách tùy chọn phòng', rooms[roomId].playersOption);
    return { success: true, message: "Người chơi đã tham gia phòng.", player };
}

// Hàm rời phòng
function leaveRoom(roomId, username) {
    if (!rooms[roomId]) {
        return { success: false, message: "Phòng không tồn tại." };
    }

    // Tìm người chơi theo username
    const index = rooms[roomId].players.findIndex(player => player.username === username);

    if (index === -1) {
        return { success: false, message: "Người chơi không có trong phòng." };
    }

    // Xóa người chơi khỏi phòng
    rooms[roomId].players.splice(index, 1);

    // Xóa phòng nếu không còn ai
    if (rooms[roomId].players.length === 0) {
        delete rooms[roomId];
    }

    return { success: true, message: "Người chơi đã rời phòng." };
}


function getRoomList() {
    return Object.keys(rooms).map(roomId => ({
        roomId: roomId,
        currentPlayers: rooms[roomId].players.length
    }));
}


function getRoomPlayers(roomId) {
    roomId = roomId.toString();
    console.log('Lấy danh sách người chơi từ phòng', roomId);
    return rooms[roomId] ?
        {
            playerDatas: rooms[roomId].players,
            roomId: roomId
        } : null;
}

module.exports = { rooms, createRoom, joinRoom, leaveRoom, getRoomList, getRoomPlayers, gamble, gambleResult, diceHistory };
