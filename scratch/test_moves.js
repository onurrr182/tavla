
const gameState = {
    board: [2,0,0,0,0,-5, 0,-3,0,0,0,5, -5,0,0,0,3,0, 5,0,0,0,0,-2],
    turn: 'host',
    bar: { white: 0, black: 0 },
    dice: [4, 4],
    movesLeft: [4, 4, 4, 4],
    borne: { white: 0, black: 0 },
    hasRolled: true
};
const myRole = 'host';
const movesCache = new Map();

function isValidTarget(to, player) {
    if (to < 0 || to > 23) return false;
    const val = gameState.board[to];
    if (val === 0) return true;
    if (player === 'host') return val >= -1;
    if (player === 'guest') return val <= 1;
    return false;
}

function canBearOff(player) {
    if ((player === 'host' ? gameState.bar.white : gameState.bar.black) > 0) return false;
    for (let i = 0; i < 24; i++) {
        const val = gameState.board[i];
        if ((player === 'host' && val > 0 && i < 18) || (player === 'guest' && val < 0 && i > 5)) return false;
    }
    return true;
}

function getValidMoves(from) {
    const results = new Map();
    if (gameState.movesLeft.length === 0) return results;

    const player = myRole;
    const dice = [...gameState.movesLeft];

    function findReachable(currentPos, remainingDice, usedDice) {
        if (remainingDice.length === 0) return;

        const uniqueDice = [...new Set(remainingDice)];
        uniqueDice.forEach(d => {
            let to;
            if (currentPos === 'bar') {
                to = player === 'host' ? d - 1 : 24 - d;
            } else {
                to = player === 'host' ? currentPos + d : currentPos - d;
            }

            if (isValidTarget(to, player)) {
                const newUsed = [...usedDice, d];
                results.set(to, { diceUsed: newUsed });
                
                const nextDice = [...remainingDice];
                nextDice.splice(nextDice.indexOf(d), 1);
                findReachable(to, nextDice, newUsed);
            } else if (canBearOff(player) && currentPos !== 'bar') {
                const isOff = (player === 'host' && (currentPos + d >= 24)) || 
                              (player === 'guest' && (currentPos - d < 0));
                if (isOff) {
                    const newUsed = [...usedDice, d];
                    results.set('off', { diceUsed: newUsed });
                }
            }
        });
    }

    findReachable(from, dice, []);
    return results;
}

console.log("Moves from point 1 (index 0):", [...getValidMoves(0).keys()]);
console.log("Moves from point 12 (index 11):", [...getValidMoves(11).keys()]);
