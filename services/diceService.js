// services/diceService.js
const oppositeFace = { 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };

// Các mặt kề của từng mặt xúc xắc
const adjacentFaces = {
    1: [2, 3, 5, 4],
    2: [1, 3, 6, 4],
    3: [1, 5, 6, 2],
    4: [1, 2, 6, 5],
    5: [1, 4, 6, 3],
    6: [2, 3, 5, 4]
};

function rollDice(currentFace) {
    if (!currentFace || currentFace < 1 || currentFace > 6) {
        currentFace = 1; // Mặc định mặt ban đầu là 1
    }

    const finalFace = Math.floor(Math.random() * 6) + 1;
    let steps = generateRollPath(currentFace, finalFace);

    return { face: finalFace, path: steps };
}

function generateRollPath(startFace, endFace) {
    let path = [];
    let currentFace = startFace;
    let stepCount = Math.floor(Math.random() * 3) + 5; // Tạo từ 5 đến 7 bước

    for (let i = 0; i < stepCount; i++) {
        let nextFaceOptions = adjacentFaces[currentFace].filter(f => f !== oppositeFace[currentFace]);
        let nextFace = nextFaceOptions[Math.floor(Math.random() * nextFaceOptions.length)];

        path.push(nextFace);
        currentFace = nextFace;

        if (currentFace === endFace) break;
    }

    if (path[path.length - 1] !== endFace) {
        path.push(endFace);
    }

    return path;
}

module.exports = { rollDice };
