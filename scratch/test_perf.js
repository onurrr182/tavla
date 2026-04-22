
const gameState = {
    board: [2,0,0,0,0,-5, 0,-3,0,0,0,5, -5,0,0,0,3,0, 5,0,0,0,0,-2],
    movesLeft: [1, 1, 1, 1], // Worst case (doubles)
    bar: { white: 0, black: 0 }
};
const myRole = 'host';

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

function isAnyMovePossible(player) {
    if (gameState.movesLeft.length === 0) return false;
    
    const barCount = player === 'host' ? gameState.bar.white : gameState.bar.black;
    if (barCount > 0) {
        return getValidMoves('bar').size > 0;
    }
    
    for (let i = 0; i < 24; i++) {
        const val = gameState.board[i];
        if ((player === 'host' && val > 0) || (player === 'guest' && val < 0)) {
            if (getValidMoves(i).size > 0) return true;
        }
    }
    return false;
}

console.time('isAnyMovePossible');
isAnyMovePossible('host');
console.timeEnd('isAnyMovePossible');
