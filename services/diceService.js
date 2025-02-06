function rollDice(currentFace) {
    if (!currentFace || currentFace < 1 || currentFace > 6) {
        currentFace = 1; // Mặc định mặt ban đầu là 1
    }

    const finalFace = Math.floor(Math.random() * 6) + 1;

    return { face: finalFace };
}

module.exports = { rollDice };
