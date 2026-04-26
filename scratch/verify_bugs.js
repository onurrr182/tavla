// Standalone verification of the game logic bugs
// Extracted from index.html

let myRole = 'host';
let movesCache = new Map();
let gameState = {
    board: [2,0,0,0,0,-5, 0,-3,0,0,0,5, -5,0,0,0,3,0, 5,0,0,0,0,-2],
    turn: 'host',
    bar: { white: 0, black: 0 },
    dice: [],
    movesLeft: [],
    borne: { white: 0, black: 0 },
    hasRolled: false
};

function invalidateCache() { movesCache.clear(); }

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
    const stateKey = `f:${from}_m:${gameState.movesLeft.join(',')}_b:${gameState.board.join(',')}_bar:${gameState.bar.white},${gameState.bar.black}`;
    if (movesCache.has(stateKey)) return movesCache.get(stateKey);
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
    movesCache.set(stateKey, results);
    return results;
}

function isAnyMovePossible(player) {
    if (gameState.movesLeft.length === 0) return false;
    const barCount = player === 'host' ? gameState.bar.white : gameState.bar.black;
    if (barCount > 0) return getValidMoves('bar').size > 0;
    for (let i = 0; i < 24; i++) {
        const val = gameState.board[i];
        if ((player === 'host' && val > 0) || (player === 'guest' && val < 0)) {
            if (getValidMoves(i).size > 0) return true;
        }
    }
    return false;
}

// ===== TEST 1: Doubles map key collision =====
console.log("===== TEST 1: Doubles [4,4,4,4] from point 0 =====");
gameState.board = [2,0,0,0,0,-5, 0,-3,0,0,0,5, -5,0,0,0,3,0, 5,0,0,0,0,-2];
gameState.movesLeft = [4, 4, 4, 4];
gameState.bar = { white: 0, black: 0 };
invalidateCache();
let m = getValidMoves(0);
console.log("Targets from 0:", [...m.keys()]);
m.forEach((v, k) => console.log("  ", k, "->", JSON.stringify(v.diceUsed)));
console.log("Expected: 4, 8, 12, 16");
console.log("BUG: Target 4 should use [4] but after recursion gets overwritten");

// ===== TEST 2: Intermediate point blocked =====
console.log("\n===== TEST 2: Blocked intermediate point =====");
gameState.board = [2,0,0,-3,0,-5, 0,-3,0,0,0,5, -5,0,0,0,3,0, 5,0,0,0,0,-2];
gameState.movesLeft = [3, 5];
invalidateCache();
m = getValidMoves(0);
console.log("From 0 with [3,5], point 3 blocked:");
m.forEach((v, k) => console.log("  ", k, "->", JSON.stringify(v.diceUsed)));
console.log("Expected: 5 (using [5]) and 8 (via 0->5->8 using [5,3])");
console.log("Point 3 blocked so 0->3 is invalid, but 0->5->8 should still work");

// ===== TEST 3: isAnyMovePossible false positive =====
console.log("\n===== TEST 3: isAnyMovePossible false positive =====");
gameState.board = [0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0];
gameState.board[0] = 2;
// Block points 1 and 2 heavily
gameState.board[1] = -5;
gameState.board[2] = -5;
gameState.movesLeft = [1, 2];
gameState.bar = { white: 0, black: 0 };
invalidateCache();
const result = isAnyMovePossible('host');
console.log("isAnyMovePossible:", result, "(expected: false - points 1 and 2 are blocked)");
m = getValidMoves(0);
console.log("Moves from 0:", [...m.keys()]);
m.forEach((v, k) => console.log("  ", k, "->", JSON.stringify(v.diceUsed)));

// ===== TEST 4: Bearing off overshoot rules =====
console.log("\n===== TEST 4: Bearing off overshoot =====");
gameState.board = [0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 3,0,0,0,2,0];
gameState.bar = { white: 0, black: 0 };
gameState.borne = { white: 10, black: 0 };
gameState.movesLeft = [6, 2];
invalidateCache();
console.log("canBearOff:", canBearOff('host'));
for (let i = 18; i < 24; i++) {
    if (gameState.board[i] > 0) {
        m = getValidMoves(i);
        console.log("Point", i, "(", 24-i, "away):");
        m.forEach((v, k) => console.log("  ", k, "->", JSON.stringify(v.diceUsed)));
    }
}
console.log("Expected: Point 18 can bear off with 6 (exact). Point 22 can bear off with 2 (exact).");
console.log("Point 22 should NOT bear off with 6 if there's a checker further back (at 18).");

// ===== TEST 5: Bearing off - highest checker rule =====
console.log("\n===== TEST 5: Bearing off highest checker with overshoot =====");
gameState.board = [0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,3,0,0,2];
gameState.bar = { white: 0, black: 0 };
gameState.borne = { white: 10, black: 0 };
gameState.movesLeft = [6, 5];
invalidateCache();
console.log("canBearOff:", canBearOff('host'));
for (let i = 18; i < 24; i++) {
    if (gameState.board[i] > 0) {
        m = getValidMoves(i);
        console.log("Point", i, "(", 24-i, "away):");
        m.forEach((v, k) => console.log("  ", k, "->", JSON.stringify(v.diceUsed)));
    }
}
console.log("Point 20 (4 away) should be able to bear off with 5 or 6 since it's the farthest back");
console.log("Point 23 (1 away) should bear off with both 5 and 6");

// ===== TEST 6: Guest movement direction =====
console.log("\n===== TEST 6: Guest movement =====");
myRole = 'guest';
gameState.board = [2,0,0,0,0,-5, 0,-3,0,0,0,5, -5,0,0,0,3,0, 5,0,0,0,0,-2];
gameState.movesLeft = [3, 5];
gameState.bar = { white: 0, black: 0 };
invalidateCache();
m = getValidMoves(23);
console.log("Guest from 23 with [3,5]:");
m.forEach((v, k) => console.log("  ", k, "->", JSON.stringify(v.diceUsed)));
console.log("Expected: 20 (using [3]), 18 (using [5]), 15 (using [3,5] or [5,3])");

// Guest bar entry
gameState.bar = { white: 0, black: 1 };
invalidateCache();
m = getValidMoves('bar');
console.log("Guest bar entry with [3,5]:");
m.forEach((v, k) => console.log("  ", k, "->", JSON.stringify(v.diceUsed)));
console.log("Expected: 21 (24-3) and 19 (24-5)");
myRole = 'host';

// ===== TEST 7: Move execution then check remaining moves =====
console.log("\n===== TEST 7: Sequential move execution =====");
gameState.board = [2,0,0,0,0,-5, 0,-3,0,0,0,5, -5,0,0,0,3,0, 5,0,0,0,0,-2];
gameState.movesLeft = [4, 4, 4, 4];
gameState.bar = { white: 0, black: 0 };
gameState.borne = { white: 0, black: 0 };
gameState.hasRolled = true;
gameState.turn = 'host';
invalidateCache();

m = getValidMoves(0);
console.log("Before move - from 0, targets:", [...m.keys()]);
if (m.has(4)) {
    // Simulate executeMove
    let moveInfo = m.get(4);
    console.log("Executing move 0->4, diceUsed:", JSON.stringify(moveInfo.diceUsed));
    gameState.board[0] -= 1;
    gameState.board[4] += 1;
    moveInfo.diceUsed.forEach(d => {
        const idx = gameState.movesLeft.indexOf(d);
        if (idx > -1) gameState.movesLeft.splice(idx, 1);
    });
    console.log("After move 1 - board[0]:", gameState.board[0], "board[4]:", gameState.board[4]);
    console.log("MovesLeft:", JSON.stringify(gameState.movesLeft));
    invalidateCache();
    
    // Can we still move?
    console.log("isAnyMovePossible after move 1:", isAnyMovePossible('host'));
    let foundMoves = false;
    for (let i = 0; i < 24; i++) {
        if (gameState.board[i] > 0) {
            let m2 = getValidMoves(i);
            if (m2.size > 0) {
                console.log("  from", i, "->", [...m2.keys()]);
                foundMoves = true;
            }
        }
    }
    if (!foundMoves) console.log("  NO MOVES FOUND!");
}

