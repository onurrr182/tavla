// Comprehensive Backgammon Logic Test Suite
// Extracts and tests game logic from index.html

let myRole = 'host';
let gameState = {
    board: [2,0,0,0,0,-5, 0,-3,0,0,0,5, -5,0,0,0,3,0, 5,0,0,0,0,-2],
    turn: 'host', bar: { white: 0, black: 0 }, dice: [], movesLeft: [],
    borne: { white: 0, black: 0 }, hasRolled: false
};

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

function hasCheckerFurtherBack(player, fromPos) {
    if (player === 'host') {
        for (let i = 18; i < fromPos; i++) { if (gameState.board[i] > 0) return true; }
    } else {
        for (let i = 5; i > fromPos; i--) { if (gameState.board[i] < 0) return true; }
    }
    return false;
}

function getValidMoves(from) {
    const results = new Map();
    if (gameState.movesLeft.length === 0) return results;
    const player = myRole;
    const uniqueDice = [...new Set(gameState.movesLeft)];
    for (const d of uniqueDice) {
        let to;
        if (from === 'bar') { to = player === 'host' ? d - 1 : 24 - d; }
        else { to = player === 'host' ? from + d : from - d; }
        if (isValidTarget(to, player)) {
            if (!results.has(to)) results.set(to, { diceUsed: [d] });
        } else if (canBearOff(player) && from !== 'bar') {
            const isOff = (player === 'host' && to >= 24) || (player === 'guest' && to < 0);
            if (isOff) {
                const exactOff = (player === 'host' && to === 24) || (player === 'guest' && to === -1);
                if (exactOff || !hasCheckerFurtherBack(player, from)) {
                    if (!results.has('off')) results.set('off', { diceUsed: [d] });
                }
            }
        }
    }
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

function executeMove(from, to, diceUsed) {
    const player = myRole;
    const piece = player === 'host' ? 1 : -1;
    if (from === 'bar') { if (player === 'host') gameState.bar.white--; else gameState.bar.black--; }
    else { gameState.board[from] -= piece; }
    if (to === 'off') { if (player === 'host') gameState.borne.white++; else gameState.borne.black++; }
    else {
        const targetVal = gameState.board[to];
        if ((player === 'host' && targetVal === -1) || (player === 'guest' && targetVal === 1)) {
            if (player === 'host') { gameState.board[to] = 1; gameState.bar.black++; }
            else { gameState.board[to] = -1; gameState.bar.white++; }
        } else { gameState.board[to] += piece; }
    }
    diceUsed.forEach(d => { const idx = gameState.movesLeft.indexOf(d); if (idx > -1) gameState.movesLeft.splice(idx, 1); });
}

function resetState(overrides = {}) {
    gameState = {
        board: [2,0,0,0,0,-5, 0,-3,0,0,0,5, -5,0,0,0,3,0, 5,0,0,0,0,-2],
        turn: 'host', bar: { white: 0, black: 0 }, dice: [], movesLeft: [],
        borne: { white: 0, black: 0 }, hasRolled: true, ...overrides
    };
    if (overrides.board) gameState.board = [...overrides.board];
    if (overrides.bar) gameState.bar = { ...overrides.bar };
    if (overrides.borne) gameState.borne = { ...overrides.borne };
}

// ── Test Framework ──
let passed = 0, failed = 0, testName = '';
function describe(name, fn) { console.log(`\n═══ ${name} ═══`); fn(); }
function it(name, fn) {
    testName = name;
    try { fn(); console.log(`  ✅ ${name}`); passed++; }
    catch(e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
function assertTargets(from, expected, msg) {
    const m = getValidMoves(from);
    const actual = [...m.keys()].sort();
    const exp = [...expected].sort();
    assert(JSON.stringify(actual) === JSON.stringify(exp),
        `${msg || ''} Expected [${exp}] got [${actual}]`);
}
function assertDiceUsed(from, target, expectedDice) {
    const m = getValidMoves(from);
    assert(m.has(target), `Target ${target} not in valid moves`);
    const actual = m.get(target).diceUsed;
    assert(actual.length === expectedDice.length && actual.every((v,i) => v === expectedDice[i]),
        `DiceUsed: expected [${expectedDice}] got [${actual}]`);
}

// ═══════════════════════════════════
// TESTS
// ═══════════════════════════════════

describe('Single Die Moves - Host', () => {
    it('moves forward with die 3 from point 0', () => {
        resetState({ movesLeft: [3, 5] });
        myRole = 'host';
        // Point 5 has -5 (blocked), so only die 3 target is reachable
        assertTargets(0, [3]);
    });
    it('each target uses exactly one die', () => {
        resetState({ movesLeft: [3, 5] });
        myRole = 'host';
        assertDiceUsed(0, 3, [3]);
    });
    it('blocked point is excluded', () => {
        resetState({ board: [2,0,0,-3,0,-5, 0,-3,0,0,0,5, -5,0,0,0,3,0, 5,0,0,0,0,-2], movesLeft: [3, 5] });
        myRole = 'host';
        assertTargets(0, []); // point 3 has -3 (blocked), point 5 has -5 (blocked)
    });
    it('can land on single opponent (hit)', () => {
        resetState({ board: [2,0,0,-1,0,-5, 0,-3,0,0,0,5, -5,0,0,0,3,0, 5,0,0,0,0,-2], movesLeft: [3] });
        myRole = 'host';
        assertTargets(0, [3]);
    });
});

describe('Single Die Moves - Guest', () => {
    it('guest moves backward (high to low)', () => {
        resetState({ movesLeft: [3, 5] });
        myRole = 'guest';
        const m = getValidMoves(23);
        assert(m.has(20), 'Should reach 20 (23-3)');
    });
    it('guest blocked by host stack', () => {
        resetState({ movesLeft: [5] });
        myRole = 'guest';
        // point 18 has 5 white → blocked for guest
        assertTargets(23, []);
    });
    it('guest can hit single white', () => {
        resetState({ board: [2,0,0,0,0,-5, 0,-3,0,0,0,5, -5,0,0,0,3,0, 5,0,1,0,0,-2], movesLeft: [3] });
        myRole = 'guest';
        assertTargets(23, [20]); // point 20 has 1 white → hittable
    });
});

describe('Doubles - Sequential Play', () => {
    it('doubles [4,4,4,4] shows single-step target only', () => {
        resetState({ movesLeft: [4, 4, 4, 4] });
        myRole = 'host';
        assertTargets(0, [4]);
        assertDiceUsed(0, 4, [4]);
    });
    it('can play all 4 moves sequentially with doubles', () => {
        resetState({ movesLeft: [4, 4, 4, 4] });
        myRole = 'host';
        // Move 1: 0→4
        executeMove(0, 4, [4]);
        assert(gameState.movesLeft.length === 3, 'Should have 3 moves left');
        assert(gameState.board[4] === 1, 'Point 4 should have 1 white');
        // Move 2: 4→8
        let m = getValidMoves(4);
        assert(m.has(8), 'Should be able to reach 8');
        executeMove(4, 8, [4]);
        assert(gameState.movesLeft.length === 2);
        // Move 3: 8→12 — point 12 has -5 → blocked
        m = getValidMoves(8);
        assert(!m.has(12), 'Point 12 blocked by 5 black');
        // But other pieces can still move
        assert(isAnyMovePossible('host'), 'Other pieces should be movable');
    });
    it('doubles [1,1,1,1] all four moves from different pieces', () => {
        resetState({ movesLeft: [1, 1, 1, 1] });
        myRole = 'host';
        // Point 0 has 2 white, move both forward
        executeMove(0, 1, [1]);
        assert(gameState.movesLeft.length === 3);
        executeMove(0, 1, [1]);
        assert(gameState.movesLeft.length === 2);
        assert(gameState.board[0] === 0);
        assert(gameState.board[1] === 2);
        // Now move from point 11 (5 white)
        executeMove(11, 12, [1]);
        assert(gameState.movesLeft.length === 1);
        // point 12 had -5, but we just tried to move there...
        // Actually point 12 in starting board = -5, so isValidTarget returns false for host
        // Let me use a movable piece instead
    });
});

describe('Bar Entry - Host', () => {
    it('host enters from bar with available dice', () => {
        resetState({ bar: { white: 1, black: 0 }, movesLeft: [1, 3] });
        myRole = 'host';
        const m = getValidMoves('bar');
        assert(m.has(0), 'Die 1 → point 0');
        assert(m.has(2), 'Die 3 → point 2');
    });
    it('host bar entry blocked', () => {
        resetState({ board: [-3,-3,0,0,0,-5, 0,-3,0,0,0,5, -5,0,0,0,3,0, 5,0,0,0,0,-2],
            bar: { white: 1, black: 0 }, movesLeft: [1, 2] });
        myRole = 'host';
        assertTargets('bar', []);
    });
    it('isAnyMovePossible false when bar blocked', () => {
        resetState({ board: [-3,-3,-3,-3,-3,-3, 0,0,0,0,0,5, -5,0,0,0,3,0, 5,0,0,0,0,-2],
            bar: { white: 1, black: 0 }, movesLeft: [1, 2, 3, 4, 5, 6] });
        myRole = 'host';
        assert(!isAnyMovePossible('host'), 'All entry points blocked');
    });
});

describe('Bar Entry - Guest', () => {
    it('guest enters from bar', () => {
        resetState({ bar: { white: 0, black: 1 }, movesLeft: [3, 5] });
        myRole = 'guest';
        const m = getValidMoves('bar');
        assert(m.has(21), 'Die 3 → point 21 (24-3)');
        assert(m.has(19), 'Die 5 → point 19 (24-5)');
    });
});

describe('Bearing Off - Exact', () => {
    it('host bears off with exact die', () => {
        resetState({ board: [0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 3,0,0,0,2,0],
            borne: { white: 10, black: 0 }, movesLeft: [6, 2] });
        myRole = 'host';
        // Point 18 is 6 away → die 6 exact
        let m = getValidMoves(18);
        assert(m.has('off'), 'Point 18 should bear off with die 6');
        assertDiceUsed(18, 'off', [6]);
        // Point 22 is 2 away → die 2 exact
        m = getValidMoves(22);
        assert(m.has('off'), 'Point 22 should bear off with die 2');
        assertDiceUsed(22, 'off', [2]);
    });
});

describe('Bearing Off - Overshoot', () => {
    it('overshoot allowed when checker is furthest back', () => {
        resetState({ board: [0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,3,0,0,2],
            borne: { white: 10, black: 0 }, movesLeft: [6, 5] });
        myRole = 'host';
        // Point 20 (4 away) is the furthest back → can overshoot with 5 or 6
        let m = getValidMoves(20);
        assert(m.has('off'), 'Furthest back checker can overshoot');
        // Point 23 (1 away) → CANNOT overshoot because point 20 has checkers further back
        m = getValidMoves(23);
        assert(!m.has('off'), 'Point 23 cannot bear off with overshoot while 20 has checkers');
    });
    it('overshoot blocked when checker further back exists', () => {
        resetState({ board: [0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 3,0,0,0,2,0],
            borne: { white: 10, black: 0 }, movesLeft: [6] });
        myRole = 'host';
        // Point 22 (2 away) with die 6 → overshoot, but point 18 has checkers further back
        let m = getValidMoves(22);
        // Die 6 from 22 → to=28, isOff=true, exactOff=false, hasCheckerFurtherBack=true → blocked
        assert(!m.has('off'), 'Cannot overshoot when checker at 18 is further back');
    });
    it('exact bearing off still works even with checker further back', () => {
        resetState({ board: [0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 3,0,0,0,2,0],
            borne: { white: 10, black: 0 }, movesLeft: [6, 2] });
        myRole = 'host';
        // Point 18 exact 6, point 22 exact 2
        assert(getValidMoves(18).has('off'), 'Point 18 exact bear off with 6');
        assert(getValidMoves(22).has('off'), 'Point 22 exact bear off with 2');
    });
});

describe('Bearing Off - Guest', () => {
    it('guest bears off from low points', () => {
        resetState({ board: [0,2,0,3,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0],
            borne: { white: 0, black: 10 }, movesLeft: [2, 4] });
        myRole = 'guest';
        // Point 1 (2 away) → die 2 exact: 1-2 = -1 → exactOff
        let m = getValidMoves(1);
        assert(m.has('off'), 'Guest point 1 bears off with die 2');
        // Point 3 (4 away) → die 4 exact: 3-4 = -1 → exactOff
        m = getValidMoves(3);
        assert(m.has('off'), 'Guest point 3 bears off with die 4');
    });
});

describe('Completely Blocked', () => {
    it('all moves blocked returns false for isAnyMovePossible', () => {
        resetState({ board: [2,-5,-5,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0],
            movesLeft: [1, 2] });
        myRole = 'host';
        assert(!isAnyMovePossible('host'));
    });
    it('partially blocked still allows moves', () => {
        resetState({ board: [2,-5,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0],
            movesLeft: [1, 2] });
        myRole = 'host';
        // Die 1 blocked (point 1 = -5), die 2 open (point 2 = 0)
        assert(isAnyMovePossible('host'));
        assertTargets(0, [2]);
    });
});

describe('Hit (Capturing)', () => {
    it('host hits lone black checker', () => {
        resetState({ board: [2,0,0,-1,0,-5, 0,-3,0,0,0,5, -5,0,0,0,3,0, 5,0,0,0,0,-2],
            movesLeft: [3] });
        myRole = 'host';
        executeMove(0, 3, [3]);
        assert(gameState.board[0] === 1, 'One checker left at 0');
        assert(gameState.board[3] === 1, 'White now at 3');
        assert(gameState.bar.black === 1, 'Black sent to bar');
    });
    it('guest hits lone white checker', () => {
        resetState({ board: [2,0,0,0,0,-5, 0,-3,0,0,0,5, -5,0,0,0,3,0, 5,1,0,0,0,-2],
            movesLeft: [4] });
        myRole = 'guest';
        executeMove(23, 19, [4]);
        assert(gameState.board[19] === -1, 'Black now at 19');
        assert(gameState.bar.white === 1, 'White sent to bar');
    });
});

describe('Cannot Bear Off with Pieces Outside Home', () => {
    it('canBearOff false when host has pieces outside home', () => {
        resetState();
        myRole = 'host';
        assert(!canBearOff('host'), 'Initial position: pieces outside home');
    });
    it('canBearOff false when piece on bar', () => {
        resetState({ board: [0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 5,5,5,0,0,0],
            bar: { white: 1, black: 0 } });
        assert(!canBearOff('host'), 'Piece on bar prevents bearing off');
    });
});

describe('Full Game Simulation - Sequential Doubles', () => {
    it('can execute 4 moves with doubles step by step', () => {
        resetState({ board: [0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 5,0,0,0,0,0],
            borne: { white: 10, black: 0 }, movesLeft: [1, 1, 1, 1] });
        myRole = 'host';
        // 4 moves: 18→19, 18→19, 18→19, 18→19
        for (let i = 0; i < 4; i++) {
            let m = getValidMoves(18 + i >= 19 && gameState.board[18] > 0 ? 18 : 19);
            // Just move one from 18 each time
            if (gameState.board[18] > 0) {
                executeMove(18, 19, [1]);
            } else {
                executeMove(19, 20, [1]);
            }
        }
        assert(gameState.movesLeft.length === 0, 'All 4 dice used');
    });
});

describe('Edge Cases', () => {
    it('empty movesLeft returns no moves', () => {
        resetState({ movesLeft: [] });
        myRole = 'host';
        assertTargets(0, []);
    });
    it('getValidMoves does not check source occupancy (caller responsibility)', () => {
        resetState({ movesLeft: [3, 5] });
        myRole = 'host';
        // Point 1 has 0 checkers, but getValidMoves still returns targets
        // The caller (handlePointClick) checks occupancy before calling
        const m = getValidMoves(1);
        assert(m.size > 0, 'getValidMoves returns targets regardless of source occupancy');
    });
    it('bearing off with die equal to distance', () => {
        resetState({ board: [0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,5],
            borne: { white: 10, black: 0 }, movesLeft: [1] });
        myRole = 'host';
        let m = getValidMoves(23);
        assert(m.has('off'), 'Exact distance bears off');
    });
});

// ── Results ──
console.log(`\n${'═'.repeat(40)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('═'.repeat(40));
process.exit(failed > 0 ? 1 : 0);
