const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

const penguinImg = new Image();
penguinImg.src = "./images/pengu.ico";

const chestImg = new Image();
chestImg.src = "./images/chest.ico";

canvas.width = 1000;
canvas.height = 520;

/* ================= INPUT ================= */

let isGameOver = false;
let enemiesSlain = 0;
let goldCollected = 0;
let goldSpent = 0;
let shopOpen = false;
let hasBow = false;
let difficulty = 1;
let goldpickup = false;
let runTime = 0;

const LOCAL_SCORES_KEY = "dungeoncrawler.scores.v1";
let storageAvailable = true;
let localScores = readLocalScores();
let leaderboardData = localScores;
let leaderboardMode = "local";
let leaderboardRequest = 0;
let submitting = false;
let effects = [];

const keys = {
    left: false, right: false, up: false, down: false,
    attack: false, switch: false, interact: false,
    aimLeft: false, aimRight: false, aimUp: false, aimDown: false
};
const touchKeys = {};
const touchPads = [];
const inputDown = action => keys[action] || touchKeys[action];

function resetKeys() {
    Object.keys(keys).forEach(key => keys[key] = false);
    Object.keys(touchKeys).forEach(key => touchKeys[key] = false);
    touchPads.forEach(pad => pad.reset());
}

function setupTouchPad(id, actions) {
    const element = document.getElementById(id);
    if (!element) return;
    const thumb = document.getElementById(id + "-thumb");
    let pointer = null;
    const reset = () => {
        const previous = pointer;
        pointer = null;
        actions.forEach(action => touchKeys[action] = false);
        thumb.style.transform = "translate(0px, 0px)";
        if (previous !== null && element.hasPointerCapture(previous)) element.releasePointerCapture(previous);
    };
    touchPads.push({ reset });
    const move = event => {
        const bounds = element.getBoundingClientRect();
        const dx = event.clientX - bounds.left - bounds.width / 2;
        const dy = event.clientY - bounds.top - bounds.height / 2;
        const length = Math.hypot(dx, dy);
        const scale = Math.min(1, bounds.width * 0.32 / (length || 1));
        thumb.style.transform = "translate(" + dx * scale + "px, " + dy * scale + "px)";
        const active = length >= 12;
        touchKeys[actions[0]] = active && dx / length < -0.38;
        touchKeys[actions[1]] = active && dx / length > 0.38;
        touchKeys[actions[2]] = active && dy / length < -0.38;
        touchKeys[actions[3]] = active && dy / length > 0.38;
    };
    element.addEventListener("pointerdown", event => {
        if (pointer !== null || isGameOver || shopOpen || (event.pointerType === "mouse" && event.button !== 0)) return;
        event.preventDefault();
        pointer = event.pointerId;
        element.setPointerCapture(pointer);
        move(event);
    });
    element.addEventListener("pointermove", event => {
        if (event.pointerId === pointer) { event.preventDefault(); move(event); }
    });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
        element.addEventListener(name, event => { if (event.pointerId === pointer) reset(); });
    }
    element.addEventListener("contextmenu", event => event.preventDefault());
}

setupTouchPad("move-pad", ["left", "right", "up", "down"]);
setupTouchPad("aim-pad", ["aimLeft", "aimRight", "aimUp", "aimDown"]);
for (const [id, action] of [["touch-switch", "switch"], ["touch-interact", "interact"]]) {
    document.getElementById(id)?.addEventListener("click", () => {
        if (!shopOpen && !isGameOver) keys[action] = true;
    });
}

function handleKey(e, pressed) {
    const key = e.key.toLowerCase();
    const controls = { a: "left", d: "right", w: "up", s: "down",
        arrowleft: "aimLeft", arrowright: "aimRight", arrowup: "aimUp", arrowdown: "aimDown",
        " ": "attack", q: "switch", e: "interact" };
    const action = controls[key];
    if (!action) return;
    if (!pressed) {
        // Keep one-shot interactions queued even if the key is released between frames.
        if (action !== "interact") keys[action] = false;
        return;
    }
    if (isGameOver || shopOpen || e.target?.closest?.("input, textarea, select, [contenteditable]")) return;
    e.preventDefault();
    if (!["switch", "interact"].includes(action) || !e.repeat) keys[action] = true;
}

window.addEventListener("keydown", e => handleKey(e, true));
window.addEventListener("keyup", e => handleKey(e, false));
window.addEventListener("blur", resetKeys);
document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetKeys();
});

/* ================= HELPERS ================= */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const center = entity => ({ x: entity.pos.x + entity.width / 2, y: entity.pos.y + entity.height / 2 });

function damageEffect(entity, damage, color) {
    effects.push({ ...center(entity), text: "−" + Math.ceil(damage), color, life: 0.65, duration: 0.65 });
}

function drawEffects(deltaTime) {
    effects = effects.filter(effect => effect.life > 0);
    effects.forEach(effect => {
        effect.life -= deltaTime;
        c.save();
        c.globalAlpha = Math.max(0, effect.life / effect.duration);
        if (effect.type === "lightning") {
            c.strokeStyle = "#b3fcff";
            c.shadowColor = "#6cdde8";
            c.shadowBlur = 12;
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(effect.from.x, effect.from.y);
            const dx = effect.to.x - effect.from.x, dy = effect.to.y - effect.from.y;
            const length = Math.hypot(dx, dy) || 1;
            for (let i = 1; i <= 6; i++) {
                const offset = i === 6 ? 0 : (i % 2 ? 6 : -6);
                c.lineTo(effect.from.x + dx * i / 6 - dy / length * offset,
                    effect.from.y + dy * i / 6 + dx / length * offset);
            }
            c.stroke();
            c.restore();
            return;
        }
        c.font = "bold 16px monospace";
        c.textAlign = "center";
        c.fillStyle = effect.color;
        c.fillText(effect.text, effect.x, effect.y - 18 - (effect.duration - effect.life) * 35);
        c.restore();
    });
}

/* ================= UI UPDATER ================= */
function updateUI(logMsg = null) {
    updateStats();
    const slainElem = document.getElementById("slain-count");
    const hpElem = document.getElementById("hp-count");
    const goldElem = document.getElementById("gold-count");

    if (slainElem) slainElem.innerText = enemiesSlain;
    if (hpElem) hpElem.innerText = Math.ceil(player ? player.health : 0);
    if (goldElem) goldElem.innerText = goldCollected - goldSpent;

    if (logMsg) {
        const log = document.getElementById("log");
        if (log) log.innerText = logMsg;
    }

    if (player) {
        const invList = document.getElementById("inventory-list");
        if (invList) {
            invList.innerHTML = "";
            player.inventory.weapons.forEach((w, i) => {
                const span = document.createElement("span");
                span.className = "inv-item " + (i === player.inventory.index ? "active-weapon" : "");
                span.innerText = w.name;
                invList.appendChild(span);
            });
        }
    }
}

function updateStats() {
    if (!player || !dungeon) return;
    const minutes = Math.floor(runTime / 60);
    const seconds = Math.floor(runTime % 60).toString().padStart(2, "0");
    const stats = {
        "floor-count": dungeon.floor,
        "gold-earned-stat": goldCollected,
        "max-hp-count": player.maxHealth,
        "perk-stat": [player.stormSpark && "Storm Spark", player.fireRing && "Fire Ring", player.lanternHeart && "Lantern Heart (+5 HP/kill)"].filter(Boolean).join(" + ") || "None",
        "enemy-health-scale": Math.round(difficulty * 100) + "%",
        "enemy-hit-stat": 12 + dungeon.floor - 1,
        "floor-badge": "DEPTH " + String(dungeon.floor).padStart(2, "0"),
        "run-time": minutes + ":" + seconds,
        "health-stat": Math.ceil(player.health) + " / " + player.maxHealth,
        "hp-count": Math.ceil(player.health),
        "weapon-stat": player.weapon.name,
        "damage-stat": player.weapon.damage,
        "ammo-stat": player.ammo,
        "speed-stat": (player.sliding ? Math.hypot(player.slideVelocity.x, player.slideVelocity.y) : player.speed * 60 * (player.slowed ? 0.5 : 1)).toFixed(0) + " px/s",
        "status-stat": [player.inFire && "Burning", player.sliding && "Sliding", player.slowed && "Slowed"].filter(Boolean).join(" · ") || "Normal",
        "remaining-count": dungeon.room.entities.filter(e => e instanceof Enemy && !e.dead).length
    };
    const healthMeter = document.getElementById("health-meter");
    const touchWeapon = document.getElementById("touch-weapon");
    if (touchWeapon) touchWeapon.textContent = player.weapon.name + (player.weapon instanceof Bow ? " · " + player.ammo : "");
    const puzzleStatus = document.getElementById("puzzle-status");
    if (puzzleStatus) {
        puzzleStatus.hidden = !dungeon.room.puzzle;
        const puzzle = dungeon.room.puzzle;
        if (puzzle) puzzleStatus.textContent = puzzle.solved ?
            (player.lanternHeart ? "Lantern Heart collected: heal 5 HP per kill." : "Lanterns solved! Collect the heart in the open niche.") :
            "Lantern Order · E near a lantern · " + puzzle.progress + "/3 lit. " + puzzle.message;
    }
    const skillMeter = document.getElementById("skill-meter");
    if (skillMeter) {
        skillMeter.max = 20;
        skillMeter.value = player.fireRing ? 20 - player.ringCooldown : 0;
        skillMeter.className = "skill-meter" + (player.ringTime > 0 ? " active" : "");
    }
    const skillStatus = document.getElementById("skill-status");
    if (skillStatus) skillStatus.textContent = !player.fireRing ? (player.stormSpark ? "Storm Spark · passive" : "No skill equipped") :
        player.ringTime > 0 ? "Fire Ring · active " + player.ringTime.toFixed(1) + "s" :
        player.ringCooldown > 0 ? "Fire Ring · " + Math.ceil(player.ringCooldown) + "s" : "Fire Ring · ready on hit";
    if (healthMeter) {
        healthMeter.max = player.maxHealth;
        healthMeter.value = player.health;
        healthMeter.className = player.health <= 30 ? "health-meter critical" : "health-meter";
    }
    const objective = document.getElementById("floor-objective");
    if (objective) objective.textContent = goldpickup ? "Treasure claimed. Find the next passage." :
        stats["remaining-count"] ? stats["remaining-count"] + " slimes remain · clear for treasure or press onward" : "Floor cleared · find your treasure chest";
    Object.entries(stats).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && element.textContent !== String(value)) element.textContent = value;
    });
}

/* ================= LEADERBOARD ================= */
function validScore(entry) {
    return entry && typeof entry.name === "string" && typeof entry.score === "number" &&
        Number.isFinite(entry.score) && entry.score >= 0 && Number.isInteger(entry.score) &&
        (entry.gold === undefined || (typeof entry.gold === "number" && Number.isFinite(entry.gold) && entry.gold >= 0));
}

function rankedScores(entries) {
    return entries.filter(validScore).map(entry => ({
        name: entry.name.trim().slice(0, 10) || "Unknown", score: entry.score, gold: entry.gold || 0
    })).sort((a, b) => b.score - a.score || b.gold - a.gold).slice(0, 10);
}

function readLocalScores() {
    let stored;
    try { stored = localStorage.getItem(LOCAL_SCORES_KEY); }
    catch { storageAvailable = false; return []; }
    try {
        const entries = JSON.parse(stored || "[]");
        return Array.isArray(entries) ? rankedScores(entries) : [];
    } catch { return []; }
}

function saveLocalScore(entry) {
    localScores = rankedScores([...localScores, entry]);
    try {
        localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(localScores));
    } catch {
        storageAvailable = false;
    }
}

function useLocalLeaderboard() {
    leaderboardMode = "local";
    leaderboardData = localScores;
    updateLeaderboardUI();
}

function updateLeaderboardUI() {
    const list = document.getElementById("leaderboard-list");
    const status = document.getElementById("leaderboard-status");
    if (status) status.textContent = leaderboardMode === "online" ? "Online leaderboard" :
        storageAvailable ? "Local leaderboard · this browser" : "Local leaderboard · this session only";
    if (!list) return;
    list.replaceChildren();
    if (!leaderboardData.length) {
        const empty = document.createElement("li");
        empty.textContent = "No scores yet. Finish a run to set the first!";
        list.appendChild(empty);
    }
    leaderboardData.forEach((entry, i) => {
        const row = document.createElement("li");
        [i + 1 + ". " + entry.name, entry.score, entry.gold || 0].forEach((value, column) => {
            const cell = document.createElement("span");
            cell.textContent = String(value);
            if (column) cell.className = column === 1 ? "leaderboard-score" : "leaderboard-gold";
            row.appendChild(cell);
        });
        list.appendChild(row);
    });
}

async function apiRequest(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
        const response = await fetch("https://jsgame-production.up.railway.app/api/" + path,
            { ...options, signal: controller.signal });
        if (!response.ok) throw new Error("Leaderboard HTTP " + response.status);
        // Keep the deadline active while reading a potentially stalled JSON body.
        if (path === "leaderboard") return await response.json();
        return response;
    } finally {
        clearTimeout(timer);
    }
}

const SLIME_TYPES = {
    goo: { body: "#66ce89", light: "#b1ef9d", dark: "#32794f", name: "Moss" },
    fire: { body: "#f78345", light: "#ffcf70", dark: "#a63d36", name: "Ember" },
    water: { body: "#53bde6", light: "#b5f0fa", dark: "#286caa", name: "Tide" }
};

/* ================= TILE ================= */

class Tile {
    constructor(x, y, size, walkable = true) {
        this.x = x; this.y = y;
        this.size = size;
        this.walkable = walkable;
    }
    draw(ctx = c) {
        const { x, y, size } = this;
        const seed = ((x / size) * 17 + (y / size) * 31) % 23;
        if (this.walkable) {
            ctx.fillStyle = seed % 2 ? "#1a292b" : "#1e2d2e";
            ctx.fillRect(x, y, size, size);
            ctx.fillStyle = "#101c20";
            ctx.fillRect(x, y, size, 2);
            ctx.fillRect(x, y, 2, size);
            ctx.fillStyle = "#293a3a";
            ctx.fillRect(x + 4, y + 3, size - 8, 1);
            if (seed % 3 === 0) {
                ctx.fillStyle = "#304240";
                ctx.fillRect(x + 8 + seed % 10, y + 23, 6, 2);
                ctx.fillRect(x + 12 + seed % 10, y + 25, 2, 4);
            }
            if (seed % 7 === 0) {
                ctx.fillStyle = "#344437";
                ctx.fillRect(x + 28, y + 8, 3, 3);
                ctx.fillRect(x + 25, y + 10, 2, 2);
            }
            return;
        }
        ctx.fillStyle = "#101a20";
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = seed % 2 ? "#3c5057" : "#34474f";
        ctx.fillRect(x + 1, y + 1, size - 2, size - 7);
        ctx.fillStyle = "#627778";
        ctx.fillRect(x + 2, y + 1, size - 4, 3);
        ctx.fillStyle = "#26383f";
        ctx.fillRect(x + 2, y + 17, size - 4, 2);
        ctx.fillRect(x + (seed % 2 ? 13 : 26), y + 4, 2, 13);
        ctx.fillRect(x + (seed % 2 ? 27 : 12), y + 19, 2, 13);
        ctx.fillStyle = "#17262d";
        ctx.fillRect(x + 2, y + size - 7, size - 4, 5);
        if (seed % 4 === 0) {
            ctx.fillStyle = "#547351";
            ctx.fillRect(x + 3, y + 4, 12, 3);
            ctx.fillRect(x + 5, y + 7, 5, 6);
            ctx.fillStyle = "#7b8f58";
            ctx.fillRect(x + 4, y + 4, 5, 2);
        }
        if (seed === 9) {
            ctx.fillStyle = "#171d22";
            ctx.fillRect(x + 16, y + 18, 8, 9);
            ctx.save();
            ctx.shadowColor = "#ffb04f";
            ctx.shadowBlur = 18;
            ctx.fillStyle = "#ef873b";
            ctx.fillRect(x + 17, y + 10, 6, 10);
            ctx.fillStyle = "#ffe4a0";
            ctx.fillRect(x + 19, y + 8, 3, 9);
            ctx.restore();
        }
    }
}

/* ================= ROOM ================= */

class Room {
    constructor(cols, rows, tileSize) {
        this.tiles = [];
        this.entities = [];
        this.doors = [];
        this.cols = cols % 2 === 0 ? cols + 1 : cols;
        this.rows = rows % 2 === 0 ? rows + 1 : rows;
        this.tileSize = tileSize;
        this.generateLabyrinth();
    }

    getTile(x, y) {
        if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return null;
        return this.tiles[y * this.cols + x];
    }

    generateLabyrinth() {
        goldpickup = false;
        this.tiles = [];
        this.terrain = null;
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.tiles.push(new Tile(x * this.tileSize, y * this.tileSize, this.tileSize, false));
            }
        }

        const stack = [];
        let current = { x: 1, y: 1 };
        const startTile = this.getTile(current.x, current.y);
        if (startTile) startTile.walkable = true;
        stack.push(current);

        while (stack.length > 0) {
            let curr = stack[stack.length - 1];
            const neighbors = [];
            const dirs = [{ x: 0, y: -2 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: -2, y: 0 }];

            for (let d of dirs) {
                let nx = curr.x + d.x;
                let ny = curr.y + d.y;
                let neighbor = this.getTile(nx, ny);
                if (neighbor && !neighbor.walkable) {
                    neighbors.push({ x: nx, y: ny, dx: d.x / 2, dy: d.y / 2 });
                }
            }

            if (neighbors.length > 0) {
                let chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
                this.getTile(curr.x + chosen.dx, curr.y + chosen.dy).walkable = true;
                this.getTile(chosen.x, chosen.y).walkable = true;
                stack.push({ x: chosen.x, y: chosen.y });
            } else {
                stack.pop();
            }
        }

        for (let i = 0; i < 175; i++) {
            let rx = Math.floor(Math.random() * (this.cols - 2)) + 1;
            let ry = Math.floor(Math.random() * (this.rows - 2)) + 1;
            this.getTile(rx, ry).walkable = true;
        }
    }

    getSafePos() {
        let found = false;
        let pos = { x: 0, y: 0 };
        while (!found) {
            let tx = Math.floor(Math.random() * this.cols);
            let ty = Math.floor(Math.random() * this.rows);
            let tile = this.getTile(tx, ty);
            if (tile && tile.walkable) {
                pos.x = tile.x + (this.tileSize - 30) / 2;
                pos.y = tile.y + (this.tileSize - 30) / 2;
                found = true;
            }
        }
        return pos;
    }

    isWalkable(x, y, w, h) {
        if (x < 0 || y < 0 || x + w > this.cols * this.tileSize || y + h > this.rows * this.tileSize) return false;
        return !this.tiles.some(t =>
            !t.walkable &&
            x < t.x + t.size &&
            x + w > t.x &&
            y < t.y + t.size &&
            y + h > t.y
        );
    }

    // Sweep each axis to the nearest wall: slide without tunnelling at high speed.
    moveActor(actor, dx, dy) {
        const moveAxis = (axis, amount) => {
            if (!amount) return;
            const horizontal = axis === "x";
            const size = horizontal ? actor.width : actor.height;
            const otherAxis = horizontal ? "y" : "x";
            const otherSize = horizontal ? actor.height : actor.width;
            const limit = (horizontal ? this.cols : this.rows) * this.tileSize - size;
            const start = actor.pos[axis];
            let end = clamp(start + amount, 0, limit);
            for (const tile of this.tiles) {
                if (tile.walkable || actor.pos[otherAxis] >= tile[otherAxis] + tile.size ||
                    actor.pos[otherAxis] + otherSize <= tile[otherAxis]) continue;
                if (amount > 0 && start + size <= tile[axis]) end = Math.min(end, tile[axis] - size);
                if (amount < 0 && start >= tile[axis] + tile.size) end = Math.max(end, tile[axis] + tile.size);
            }
            actor.pos[axis] = end;
        };
        moveAxis("x", dx);
        moveAxis("y", dy);
    }

    hasLineOfSight(a, b) {
        const distance = dist(a, b);
        const steps = Math.max(1, Math.ceil(distance / 5));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            if (!this.isWalkable(a.x + (b.x - a.x) * t - 1, a.y + (b.y - a.y) * t - 1, 2, 2)) return false;
        }
        return true;
    }

    findPath(actor, destination) {
        const origin = center(actor);
        const cell = point => ({ x: Math.floor(point.x / this.tileSize), y: Math.floor(point.y / this.tileSize) });
        const start = cell(origin), goal = cell(destination);
        const key = point => point.y * this.cols + point.x;
        const queue = [start], parents = new Map([[key(start), null]]);
        let found = false;
        for (let i = 0; i < queue.length; i++) {
            const current = queue[i];
            if (current.x === goal.x && current.y === goal.y) { found = true; break; }
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const next = { x: current.x + dx, y: current.y + dy };
                const tile = this.getTile(next.x, next.y);
                if (!tile?.walkable || parents.has(key(next))) continue;
                parents.set(key(next), current);
                queue.push(next);
            }
        }
        if (!found) return [];
        const cells = [];
        for (let current = goal; current; current = parents.get(key(current))) cells.push(current);
        cells.reverse();
        const points = cells.slice(1).map(point => ({ x: (point.x + 0.5) * this.tileSize, y: (point.y + 0.5) * this.tileSize }));
        if (!points.length) return [{ x: (start.x + 0.5) * this.tileSize, y: (start.y + 0.5) * this.tileSize }];
        // Align across the corridor before turning; don't backtrack along the travel axis on replanning.
        points.unshift(cells[1].x !== start.x ? { x: origin.x, y: (start.y + 0.5) * this.tileSize } :
            { x: (start.x + 0.5) * this.tileSize, y: origin.y });
        return points;
    }

    drawTerrain() {
        if (!this.terrain) {
            this.terrain = document.createElement("canvas");
            this.terrain.width = this.cols * this.tileSize;
            this.terrain.height = this.rows * this.tileSize;
            const terrainContext = this.terrain.getContext("2d");
            this.tiles.forEach(tile => tile.draw(terrainContext));
        }
        c.drawImage(this.terrain, 0, 0);
    }

    draw() {
        this.drawTerrain();
        this.doors.forEach(d => d.draw());
        const visible = this.entities.filter(e => !e.dead);
        [...visible.filter(e => e instanceof GooPuddle), ...visible.filter(e => !(e instanceof GooPuddle))].forEach(e => {
            e.draw();
            if (e instanceof Living) e.drawHealth();
        });
    }

    update(deltaTime) {
        this.drawTerrain();
        this.doors.forEach(d => d.draw());

        this.entities = this.entities.filter(e => !e.dead);
        player.onWater = false;
        player.inFire = false;
        player.speedModifier = 1;
        this.entities.filter(e => e instanceof GooPuddle).forEach(e => e.update(deltaTime));
        this.entities.filter(e => !(e instanceof GooPuddle)).forEach(e => e.update(deltaTime));

        const enemiesLeft = this.entities.some(e => e instanceof Enemy);
        const chestExists = this.entities.some(e => e instanceof Chest);

        if (!enemiesLeft && !chestExists) {
            const pos = this.getSafePos();
            this.entities.push(new Chest(pos.x, pos.y));
        }
    }
}

/* ================= DUNGEON ================= */

class Dungeon {
    constructor() {
        this.currentRoom = null;
        this.floor = 0;
        this.nextLevel();
    }

    nextLevel() {
        this.floor++;
        this.shopPurchased = false;
        this.perkOffer = Math.random() < 0.5 ? "storm" : "fire";
        difficulty = 1 + (this.floor - 1) * 0.12;
        const newRoom = new Room(25, 12, 40);
        newRoom.doors.push(new Door(960, 200));
        if (this.floor === 1) createLanternPuzzle(newRoom);
        // Reserve the arrival before placing enemies, rather than hoping for an empty random tile.
        this.spawn = this.floor === 1 ? { x: 45, y: 125 } : newRoom.getSafePos();
        const enemySpawns = newRoom.tiles.filter(tile => tile.walkable).map(tile =>
            ({ x: tile.x + 5, y: tile.y + 5 })).filter(pos =>
            dist({ x: this.spawn.x + 12.5, y: this.spawn.y + 10 }, { x: pos.x + 17.5, y: pos.y + 15 }) >= 280);

        const enemyCount = Math.min(12, 4 + Math.floor((this.floor - 1) / 2));
        for (let i = 0; i < enemyCount; i++) {
            const pos = enemySpawns[Math.floor(Math.random() * enemySpawns.length)];
            const element = i < 3 ? ["goo", "fire", "water"][i] : ["goo", "fire", "water"][Math.floor(Math.random() * 3)];
            newRoom.entities.push(new Enemy(pos.x, pos.y, element));
        }

        const itemSpawns = newRoom.tiles.filter(tile => tile.walkable &&
            (this.floor !== 1 || tile.x >= 240 || tile.y >= 160)).map(tile => ({ x: tile.x + 5, y: tile.y + 5 }));
        for (let i = 0; i < 3; i++) {
            const itemPos = itemSpawns[Math.floor(Math.random() * itemSpawns.length)];
            const rand = Math.random();
            let type;
            if (rand < 0.4) type = "health";
            else if (rand < 0.8) type = "speed";
            else if (!hasBow) type = "bow";
            else type = "health";

            newRoom.entities.push(new Item(itemPos.x, itemPos.y, type));
        }
        for (let i = 0; i < 2; i++) {
            const pos = itemSpawns[Math.floor(Math.random() * itemSpawns.length)];
            newRoom.entities.push(new Item(pos.x, pos.y, "arrows"));
        }

        this.currentRoom = newRoom;
        if (player) {
            const newPos = this.spawn;
            player.pos.x = newPos.x;
            player.pos.y = newPos.y;
        }
    }
    get room() { return this.currentRoom; }
}

/* ================= ENTITY ================= */

class Entity {
    constructor(x, y, w, h, color) {
        this.pos = { x, y };
        this.width = w;
        this.height = h;
        this.color = color;
        this.dead = false;
    }
    draw() {
        c.fillStyle = this.color;
        c.fillRect(this.pos.x, this.pos.y, this.width, this.height);
    }
    update(deltaTime) { this.draw(); }
    destroy() { this.dead = true; }
}

/* ================= ITEMS ================= */

function createLanternPuzzle(room) {
    // A hand-authored alcove joins the maze's guaranteed starting tile (1,1).
    for (let y = 1; y <= 3; y++) {
        for (let x = 1; x <= 5; x++) room.getTile(x, y).walkable = true;
    }
    room.terrain = null;
    const order = [0, 1, 2];
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    room.puzzle = { order, progress: 0, solved: false, errorUntil: 0, message: "Discover the order. Wrong choices reset the lanterns." };
    for (let i = 0; i < 3; i++) room.entities.push(new Lantern(48 + i * 80, 88, i));
    room.entities.push(new LanternNiche(208, 128));
}

function interactLantern() {
    const room = dungeon.room;
    if (!room.puzzle || room.puzzle.solved) return;
    const lantern = room.entities.filter(entity => entity instanceof Lantern &&
        dist(center(player), center(entity)) <= 45 && room.hasLineOfSight(center(player), center(entity)))
        .sort((a, b) => dist(center(player), center(a)) - dist(center(player), center(b)))[0];
    if (!lantern) { updateUI("Move beside a lantern and press E."); return; }
    const puzzle = room.puzzle;
    if (puzzle.order[puzzle.progress] !== lantern.index) {
        puzzle.progress = 0;
        puzzle.errorUntil = runTime + 0.7;
        puzzle.message = "Wrong lantern. Sequence reset.";
    } else {
        puzzle.progress++;
        puzzle.message = "Lantern " + ["I", "II", "III"][lantern.index] + " lit.";
        if (puzzle.progress === 3) {
            puzzle.solved = true;
            room.entities.push(new Item(208, 128, "lantern-heart"));
            puzzle.message = "The niche opens! Collect the Lantern Heart.";
        }
    }
    updateUI(puzzle.message);
}

class Lantern extends Entity {
    constructor(x, y, index) { super(x, y, 24, 28, "#b78a48"); this.index = index; }
    draw() {
        const puzzle = dungeon.room.puzzle;
        const lit = puzzle.order.slice(0, puzzle.progress).includes(this.index);
        const error = puzzle.errorUntil > runTime;
        c.save();
        c.fillStyle = "#39484b"; c.fillRect(this.pos.x - 3, this.pos.y + 23, 30, 5);
        c.fillStyle = "#b78a48"; c.fillRect(this.pos.x + 3, this.pos.y + 2, 18, 22);
        c.fillStyle = error ? (Math.floor((puzzle.errorUntil - runTime) * 10) % 2 ? "#ff4141" : "#9e2525") : lit ? "#ffe89c" : "#493b2b";
        if (lit || error) { c.shadowColor = error ? "#ff3030" : "#ffb34f"; c.shadowBlur = 18; }
        c.fillRect(this.pos.x + 7, this.pos.y + 6, 10, 14);
        c.shadowBlur = 0;
        c.fillStyle = "#fff0c8"; c.font = "bold 12px monospace"; c.textAlign = "center";
        c.fillText(["I", "II", "III"][this.index], this.pos.x + 12, this.pos.y - 5);
        if (this.index === 1) {
            c.fillStyle = "#172124"; c.fillRect(43, 42, 194, 24);
            c.fillStyle = "#ffe1a0"; c.fillText("LANTERN ORDER", 140, 58);
        }
        c.restore();
    }
}

class LanternNiche extends Entity {
    constructor(x, y) { super(x, y, 26, 28, "#536267"); }
    draw() {
        c.fillStyle = "#536267"; c.fillRect(this.pos.x - 3, this.pos.y - 3, 30, 30);
        c.fillStyle = "#142125"; c.fillRect(this.pos.x, this.pos.y, 24, 24);
        if (!dungeon.room.puzzle.solved) {
            c.fillStyle = "#9c824e";
            for (let i = 0; i < 3; i++) c.fillRect(this.pos.x + 3 + i * 8, this.pos.y, 2, 24);
        }
    }
}

class Item extends Entity {
    constructor(x, y, type) {
        super(x, y, 24, 24, "transparent");
        this.type = type;
    }

    draw() {
        const px = this.width / 8;
        const ox = this.pos.x;
        const oy = this.pos.y;

        if (this.type === "lantern-heart") {
            c.fillStyle = "#ffb765";
            c.fillRect(ox + 3, oy + 4, 8, 10); c.fillRect(ox + 13, oy + 4, 8, 10);
            c.fillRect(ox + 6, oy + 9, 12, 10); c.fillRect(ox + 10, oy + 19, 4, 3);
            c.fillStyle = "#fff1b3"; c.fillRect(ox + 6, oy + 6, 3, 4);
        } else if (this.type === "coin") {
            c.fillStyle = "#efbb46";
            c.fillRect(ox + 6, oy + 5, 12, 14);
            c.fillStyle = "#ffe9a0";
            c.fillRect(ox + 9, oy + 7, 3, 10);
        } else if (this.type === "health" || this.type === "small-health") {
            c.fillStyle = "#8B4513"; c.fillRect(ox + 3 * px, oy, 2 * px, px);
            c.fillStyle = "#ADD8E6"; c.fillRect(ox + 2 * px, oy + px, 4 * px, px);
            c.fillStyle = "#F0F8FF"; c.fillRect(ox + px, oy + 2 * px, 6 * px, 6 * px);
            c.fillStyle = "#FF0000";
            c.fillRect(ox + 2 * px, oy + 4 * px, 4 * px, 3 * px);
            c.fillRect(ox + 3 * px, oy + 3 * px, 2 * px, px);
            if (this.type === "small-health") {
                c.fillStyle = "#fff0c5";
                c.font = "bold 10px monospace";
                c.fillText("+5", ox + 4, oy - 2);
            }
        } else if (this.type === "bow") {

            // 0. Draw the Bowstring
            c.fillStyle = "white";
            const bowstring = [
                [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8]
            ];
            bowstring.forEach(([x, y]) => c.fillRect(ox + x * px, oy + y * px, px, px));

            // 1. Draw the Brown Bow Body
            c.fillStyle = "brown"; // Brown
            const wood = [
                [1, 0], [2, 0],
                [2, 1], [3, 1],
                [3, 2],
                [4, 2], [4, 3], [4, 4], [4, 5], [4, 6],
                [3, 6],
                [3, 7], [2, 7],
                [2, 8], [1, 8]
            ];
            wood.forEach(([x, y]) => c.fillRect(ox + x * px, oy + y * px, px, px));

            // 2. Draw the Black Arrow & Grip
            c.fillStyle = "black";
            const arrow = [
                [1, 4], [2, 4], [3, 4], // Arrow shaft/Grip
                [5, 3],
                [5, 4],            // Top of arrowhead
                [5, 5],             // Bottom of arrowhead
                [6, 4], [7, 4]        // Tip of arrow
            ];
            arrow.forEach(([x, y]) => c.fillRect(ox + x * px, oy + y * px, px, px));

        } else if (this.type === "arrows") {
            for (let i = 0; i < 3; i++) {
                const x = ox + 4 + i * 7;
                c.fillStyle = "#aa7845"; c.fillRect(x, oy + 5, 2, 17);
                c.fillStyle = "#d8ffff"; c.fillRect(x - 2, oy + 3, 6, 4);
                c.fillRect(x - 1, oy + 1, 4, 2);
                c.fillStyle = "#60b9ad"; c.fillRect(x - 2, oy + 18, 6, 4);
            }
        } else if (this.type === "speed") {
            // Speed boost visualization
            c.fillStyle = "purple";
            c.fillRect(ox + 2 * px, oy, 4 * px, 8 * px);
            c.fillStyle = "magenta";
            c.fillRect(ox, oy + 2 * px, 8 * px, 4 * px);
        }
    }

    update(deltaTime) {
        if (this.dead) return;
        if (player.health <= 0) { this.draw(); return; }
        if (dist(this.pos, player.pos) < 30) {
            if (this.type === "small-health" && player.health >= player.maxHealth) { this.draw(); return; }
            if (this.type === "lantern-heart") {
                player.lanternHeart = true;
                updateUI("Lantern Heart: every kill restores 5 HP for this run!");
            } else if (this.type === "coin") {
                goldCollected += this.amount || 3;
                updateUI("Collected coins!");
            } else if ((this.type === "health" || this.type === "small-health") && player.health < player.maxHealth) {
                player.health = Math.min(player.maxHealth, player.health + (this.type === "health" ? 25 : 5));
                updateUI("Picked up Health Potion");
            } else if (this.type === "bow") {
                hasBow = player.inventory.weapons.some(w => w instanceof Bow);
                if (!hasBow) {
                    const bow = new Bow();
                    bow.damage += player.damageBonus;
                    player.inventory.weapons.push(bow);
                    player.ammo += 8;
                    updateUI("Picked up a Bow and 8 arrows! Q switches weapons.");
                    hasBow = true;
                }
            } else if (this.type === "arrows") {
                player.ammo += 6;
                updateUI("Picked up 6 arrows!");
            } else if (this.type === "speed") {
                player.speed += 0.4;
                updateUI("Speed Increased!");
            }
            this.destroy();
        }
        this.draw();
    }
}

/* ================= LIVING ================= */

class Living extends Entity {
    constructor(x, y, w, h, color) {
        super(x, y, w, h, color);
        this.maxHealth = 100;
        this.health = 100;
        this.speed = 2;
        this.hitFlash = 0;
    }
    onHit(dmg) {
        if (this.dead || dmg <= 0) return false;
        this.hitFlash = 0.18;
        damageEffect(this, Math.min(dmg, this.health), this instanceof Player ? "#ff7777" : "#ffe6a3");
        this.health -= dmg;
        if (this.health <= 0) {
            this.health = 0;
            this.destroy();
        }
        return true;
    }
    tickFeedback(deltaTime) { this.hitFlash = Math.max(0, this.hitFlash - deltaTime); }
    drawHealth() {
        if (this.hitFlash > 0) {
            c.fillStyle = "rgba(255,255,255,0.5)";
            c.fillRect(this.pos.x, this.pos.y, this.width, this.height);
        }
        c.fillStyle = "black";
        c.fillRect(this.pos.x, this.pos.y - 8, this.width, 5);
        c.fillStyle = "lime";
        if (this.health > 0) {
            c.fillRect(this.pos.x, this.pos.y - 8, this.width * (this.health / this.maxHealth), 5);
        }
    }
    update(deltaTime) {
        this.draw();
        this.drawHealth();
    }
}

/* ================= WEAPONS & PROJECTILES ================= */

function strikeEnemy(enemy, damage) {
    if (!enemy.onHit(damage)) return;
    if (player.fireRing && player.ringCooldown <= 0) {
        player.ringTime = 5;
        player.ringCooldown = 20;
        player.ringPulse = 0;
    }
    if (!player.stormSpark) return;
    const origin = center(enemy);
    const nearby = dungeon.room.entities.filter(target => target instanceof Enemy && target !== enemy && !target.dead &&
        dist(origin, center(target)) <= 90 && dungeon.room.hasLineOfSight(origin, center(target)))
        .sort((a, b) => dist(origin, center(a)) - dist(origin, center(b)))[0];
    if (!nearby) return;
    effects.push({ type: "lightning", from: origin, to: center(nearby), life: 0.22, duration: 0.22 });
    // Direct onHit prevents chained hits from recursively producing more lightning.
    nearby.onHit(Math.round(damage * 0.5));
}

class Sword {
    constructor() { this.name = "Sword"; this.damage = 25; this.range = 50; }
    attack(owner, room) {
        const origin = center(owner);
        const angle = Math.atan2(owner.dir.y, owner.dir.x);
        owner.swing = { angle, remaining: 0.24, duration: 0.24, range: this.range };
        room.entities.forEach(enemy => {
            if (!(enemy instanceof Enemy) || enemy.dead) return;
            const target = center(enemy);
            const offset = Math.atan2(target.y - origin.y, target.x - origin.x) - angle;
            const difference = Math.atan2(Math.sin(offset), Math.cos(offset));
            if (dist(origin, target) <= this.range + enemy.width / 2 && Math.abs(difference) <= 1.2 &&
                room.hasLineOfSight(origin, target)) {
                strikeEnemy(enemy, this.damage);
            }
        });
    }
}

class Bow {
    constructor() { this.name = "Bow"; this.damage = 20; this.range = 300; }
    attack(owner, room, direction = owner.dir) {
        if (owner.ammo <= 0) {
            updateUI("Out of arrows. Collect a bundle or press Q for the sword.");
            return;
        }
        owner.ammo--;
        updateStats();
        const origin = center(owner);
        arrows.push(new Arrow(origin.x, origin.y, direction, this.damage, this.range));
    }
}

class Arrow extends Entity {
    constructor(x, y, dir, damage = 20, range = 300) {
        super(x, y, 8, 4, "#d8ffff");
        const length = Math.hypot(dir.x, dir.y);
        const direction = length ? { x: dir.x / length, y: dir.y / length } : { x: 1, y: 0 };
        this.vel = { x: direction.x * 7, y: direction.y * 7 };
        this.angle = Math.atan2(direction.y, direction.x);
        this.damage = damage;
        this.remainingRange = range;
    }
    draw() {
        c.save();
        c.translate(this.pos.x, this.pos.y);
        c.rotate(this.angle);
        c.shadowColor = "#75e8e1";
        c.shadowBlur = 10;
        c.strokeStyle = "rgba(111,230,219,0.28)";
        c.lineWidth = 5;
        c.beginPath();c.moveTo(-24, 0);c.lineTo(0, 0);c.stroke();
        c.shadowBlur = 0;
        c.strokeStyle = "#d5ba81";
        c.lineWidth = 2;
        c.beginPath();c.moveTo(-11, 0);c.lineTo(4, 0);c.stroke();
        c.fillStyle = "#eafff4";
        c.beginPath();c.moveTo(10, 0);c.lineTo(2, -4);c.lineTo(2, 4);c.closePath();c.fill();
        c.strokeStyle = "#86d6c9";
        c.beginPath();c.moveTo(-6, 0);c.lineTo(-12, -4);c.moveTo(-6, 0);c.lineTo(-12, 4);c.stroke();
        c.restore();
    }
    update(deltaTime) {
        if (this.dead) return;
        const distance = Math.min(Math.hypot(this.vel.x, this.vel.y) * deltaTime * 60, this.remainingRange);
        const steps = Math.max(1, Math.ceil(distance / 4));
        const speed = Math.hypot(this.vel.x, this.vel.y) || 1;
        // Small swept steps hit the first wall/target, even during a lagged frame.
        for (let step = 0; step < steps; step++) {
            this.pos.x += this.vel.x / speed * distance / steps;
            this.pos.y += this.vel.y / speed * distance / steps;
            if (!dungeon.room.isWalkable(this.pos.x - 2, this.pos.y - 2, 4, 4)) {
                this.destroy();
                break;
            }
            const target = dungeon.room.entities.find(enemy => enemy instanceof Enemy && !enemy.dead &&
                this.pos.x + 2 >= enemy.pos.x && this.pos.x - 2 <= enemy.pos.x + enemy.width &&
                this.pos.y + 2 >= enemy.pos.y && this.pos.y - 2 <= enemy.pos.y + enemy.height);
            if (target) { strikeEnemy(target, this.damage); this.destroy(); break; }
        }
        this.remainingRange -= distance;
        if (this.remainingRange <= 0) this.destroy();
        if (!this.dead) this.draw();
    }
}

/* ================= PLAYER ================= */

class Player extends Living {
    constructor(x, y) {
        super(x, y, 25, 20, "deepskyblue");
        this.inventory = { weapons: [new Sword()], index: 0 };
        this.ammo = 0;
        this.damageBonus = 0;
        this.stormSpark = false;
        this.lanternHeart = false;
        this.fireRing = false;
        this.ringTime = 0;
        this.ringCooldown = 0;
        this.ringPulse = 0;
        this.dir = { x: 1, y: 0 };
        this.speedModifier = 1;
        this.speed = 4;
        this.cooldown = 0;
        this.slowed = false;
        this.invulnerable = 0;
        this.swing = null;
        this.onWater = false;
        this.inFire = false;
        this.fireCooldown = 0;
        this.sliding = false;
        this.slideTime = 0;
        this.slideVelocity = { x: 0, y: 0 };
    }

    get weapon() { return this.inventory.weapons[this.inventory.index]; }

    movement(deltaTime) {
        let dx = (inputDown("right") ? 1 : 0) - (inputDown("left") ? 1 : 0);
        let dy = (inputDown("down") ? 1 : 0) - (inputDown("up") ? 1 : 0);
        let mag = Math.hypot(dx, dy) || 1;
        dx /= mag; dy /= mag;

        this.slowed = this.speedModifier < 1;
        const speed = this.speed * this.speedModifier * 60;
        const desired = { x: dx * speed, y: dy * speed };
        if (this.onWater) {
            if (this.slideTime <= 0) this.slideVelocity = { x: this.dir.x * speed * 1.35, y: this.dir.y * speed * 1.35 };
            if (dx || dy) {
                const steering = 1 - Math.exp(-2.5 * deltaTime);
                this.slideVelocity.x += (desired.x * 1.35 - this.slideVelocity.x) * steering;
                this.slideVelocity.y += (desired.y * 1.35 - this.slideVelocity.y) * steering;
            }
            this.slideTime = 0.45;
        } else if (this.slideTime > 0) {
            this.slideTime = Math.max(0, this.slideTime - deltaTime);
            const friction = 1 - Math.exp(-8 * deltaTime);
            this.slideVelocity.x += (desired.x - this.slideVelocity.x) * friction;
            this.slideVelocity.y += (desired.y - this.slideVelocity.y) * friction;
        }
        this.sliding = this.onWater || this.slideTime > 0;
        const velocity = this.sliding ? this.slideVelocity : desired;
        const before = { ...this.pos };
        const requestedX = velocity.x * deltaTime, requestedY = velocity.y * deltaTime;
        dungeon.room.moveActor(this, requestedX, requestedY);
        if (Math.abs(this.pos.x - before.x - requestedX) > 0.01) this.slideVelocity.x = 0;
        if (Math.abs(this.pos.y - before.y - requestedY) > 0.01) this.slideVelocity.y = 0;
        const movedX = this.pos.x - before.x;
        const movedY = this.pos.y - before.y;
        const moved = Math.hypot(movedX, movedY);
        if (moved > 0) this.dir = { x: movedX / moved, y: movedY / moved };
        this.speedModifier = 1; // Reset slow effect
    }

    onHit(damage) {
        if (this.invulnerable > 0 || !super.onHit(damage)) return false;
        this.invulnerable = 0.7;
        updateUI("Ouch! Took " + damage + " damage. Keep moving!");
        return true;
    }

    drawSwing() {
        if (this.ringTime > 0) {
            const origin = center(this);
            c.save();
            c.strokeStyle = "#ff933e";
            c.shadowColor = "#ff4d20";
            c.shadowBlur = 18;
            c.lineWidth = 6;
            c.beginPath();
            c.arc(origin.x, origin.y, 70, 0, Math.PI * 2);
            c.fillStyle = "rgba(255,100,25,0.12)";
            c.fill();
            c.stroke();
            for (let i = 0; i < 16; i++) {
                const angle = i * Math.PI / 8 + runTime * 1.6;
                const radius = 70 + Math.sin(runTime * 12 + i) * 4;
                c.fillStyle = i % 2 ? "#ffe59c" : "#ff572b";
                c.fillRect(origin.x + Math.cos(angle) * radius - 3,
                    origin.y + Math.sin(angle) * radius - 5, 5, 9);
            }
            c.restore();
        }
        if (!this.swing || this.swing.remaining <= 0) return;
        const { angle, remaining, duration, range } = this.swing;
        const progress = 1 - remaining / duration;
        const origin = center(this);
        const tip = angle - 1.2 + progress * 2.4;
        c.save();
        c.translate(origin.x, origin.y);
        c.globalAlpha = Math.min(1, remaining / 0.08);
        c.beginPath();
        c.arc(0, 0, range, angle - 1.2, tip);
        c.arc(0, 0, range - 14, tip, angle - 1.2, true);
        c.closePath();
        c.fillStyle = "rgba(160,225,255,0.45)";
        c.fill();
        c.beginPath();
        c.arc(0, 0, range, Math.max(angle - 1.2, tip - 0.65), tip);
        c.strokeStyle = "#e5faff";
        c.lineWidth = 3;
        c.stroke();
        // The bright blade leads the fading crescent.
        c.beginPath();
        c.moveTo(Math.cos(tip) * 12, Math.sin(tip) * 12);
        c.lineTo(Math.cos(tip) * range, Math.sin(tip) * range);
        c.strokeStyle = "white";
        c.lineWidth = 4;
        c.stroke();
        c.restore();
    }

    draw() {
        c.save();
        if (this.invulnerable > 0 && Math.floor(this.invulnerable * 16) % 2 === 0) c.globalAlpha = 0.45;
        c.drawImage(penguinImg, this.pos.x, this.pos.y, this.width, this.height);
        c.restore();
    }

    update(deltaTime) {
        if (this.health <= 0) {
            this.dead = true;
            isGameOver = true;
            return;
        }

        this.tickFeedback(deltaTime);
        this.ringCooldown = Math.max(0, this.ringCooldown - deltaTime);
        if (this.ringTime > 0) {
            this.ringTime = Math.max(0, this.ringTime - deltaTime);
            this.ringPulse -= deltaTime;
            if (this.ringTime > 0 && this.ringPulse <= 0) {
                this.ringPulse = 0.5;
                dungeon.room.entities.slice().forEach(enemy => {
                    if (enemy instanceof Enemy && !enemy.dead && dist(center(this), center(enemy)) <= 70 &&
                        dungeon.room.hasLineOfSight(center(this), center(enemy))) enemy.onHit(8);
                });
            }
        }
        this.fireCooldown = Math.max(0, this.fireCooldown - deltaTime);
        this.invulnerable = Math.max(0, this.invulnerable - deltaTime);
        if (this.swing) this.swing.remaining = Math.max(0, this.swing.remaining - deltaTime);
        this.movement(deltaTime);
        if (keys.interact) { keys.interact = false; interactLantern(); }

        if (keys.switch) {
            this.inventory.index = (this.inventory.index + 1) % this.inventory.weapons.length;
            keys.switch = false;
            updateUI("Switched to " + this.weapon.name);
        }

        this.cooldown = Math.max(0, this.cooldown - deltaTime);
        const aim = { x: (inputDown("aimRight") ? 1 : 0) - (inputDown("aimLeft") ? 1 : 0),
            y: (inputDown("aimDown") ? 1 : 0) - (inputDown("aimUp") ? 1 : 0) };
        const aiming = aim.x !== 0 || aim.y !== 0;
        if (aiming) {
            const length = Math.hypot(aim.x, aim.y);
            this.dir = { x: aim.x / length, y: aim.y / length };
        }
        if (this.cooldown <= 0 && (keys.attack || aiming)) {
            this.weapon.attack(this, dungeon.room);
            this.cooldown = 0.4;
        }

        super.update(deltaTime);
    }
}

/* ================= ENEMY (SLIME) ================= */

class Enemy extends Living {
    constructor(x, y, element = "goo") {
        super(x, y, 35, 30, "#00ff77");
        this.element = SLIME_TYPES[element] ? element : "goo";
        this.trailTimer = 1.5;
        this.path = [];
        this.repathTimer = 0;
        this.attackTimer = 0;
        this.windingUp = false;
        this.strikeFlash = 0;
        this.shotTimer = 2 + Math.random() * 2;
        this.walkTime = Math.random() * Math.PI * 2;
        this.moving = false;
        const depth = Math.round((difficulty - 1) / 0.12);
        this.meleeDamage = 12 + depth;
        this.shotRate = Math.max(0.55, 1 / (1 + depth * 0.06));
        this.shotTimer *= this.shotRate;
        this.maxHealth = Math.round(100 * difficulty);
        this.health = this.maxHealth;
        this.speed = Math.min(2.8, 1.6 + depth * 0.06);
    }

    destroy() {
        if (!this.dead) {
            enemiesSlain++;
            if (player.lanternHeart && player.health > 0) player.health = Math.min(player.maxHealth, player.health + 5);
            const coin = new Item(this.pos.x, this.pos.y, "coin");
            coin.amount = 3 + Math.floor(Math.random() * 4);
            dungeon.room.entities.push(coin);
            if (Math.random() < 0.25) dungeon.room.entities.push(new Item(this.pos.x + 10, this.pos.y, "small-health"));
            if (this.element !== "goo") spawnHazard(dungeon.room, center(this), this.element);
            updateUI(SLIME_TYPES[this.element].name + " slime defeated!");
        }
        super.destroy();
    }

    draw() {
        c.save();
        if (!this.dead && player.ringTime > 0 && dist(center(player), center(this)) <= 70 &&
            dungeon.room.hasLineOfSight(center(player), center(this))) {
            const origin = center(this);
            c.strokeStyle = "#ff9944";
            c.lineWidth = 2;
            c.strokeRect(this.pos.x - 3, this.pos.y - 3, this.width + 6, this.height + 6);
            c.fillStyle = "#ff6d2d";
            c.beginPath();
            c.moveTo(origin.x, this.pos.y - 20);
            c.lineTo(origin.x - 6, this.pos.y - 8);
            c.lineTo(origin.x + 6, this.pos.y - 8);
            c.closePath();
            c.fill();
            c.fillStyle = "#ffe6a0";
            c.fillRect(origin.x - 2, this.pos.y - 12, 4, 5);
        }
        if (this.windingUp || this.strikeFlash > 0) {
            const origin = center(this);
            c.beginPath();
            c.arc(origin.x, origin.y, 44, 0, Math.PI * 2);
            c.strokeStyle = this.windingUp ? "#ffb347" : "#ff6655";
            c.lineWidth = 2;
            c.stroke();
            c.fillStyle = "#ffb347";
            c.font = "bold 20px monospace";
            c.textAlign = "center";
            c.fillText("!", origin.x, this.pos.y - 14);
        }
        c.translate(0, this.moving ? Math.sin(this.walkTime) * 1.5 : 0);
        const px = this.width / 8;
        const py = this.height / 6;
        const palette = SLIME_TYPES[this.element];
        c.fillStyle = palette.body;
        c.fillRect(this.pos.x + px * 2, this.pos.y, px * 4, py);
        c.fillRect(this.pos.x + px, this.pos.y + py, px * 6, py);
        c.fillRect(this.pos.x, this.pos.y + py * 2, px * 8, py);
        c.fillRect(this.pos.x, this.pos.y + py * 3, px * 8, py);
        c.fillRect(this.pos.x + px, this.pos.y + py * 4, px * 6, py);
        c.fillStyle = palette.dark;
        c.fillRect(this.pos.x + px, this.pos.y + py * 4, px * 6, py);
        c.fillStyle = palette.light;
        c.fillRect(this.pos.x + px * 2, this.pos.y + py, px * 2, py);
        if (this.element === "fire") {
            c.fillRect(this.pos.x + px * 3, this.pos.y - py, px, py * 2);
            c.fillRect(this.pos.x + px * 5, this.pos.y - py * 0.5, px, py);
        } else if (this.element === "water") {
            c.fillRect(this.pos.x + px * 4, this.pos.y - py, px, py);
            c.fillRect(this.pos.x + px * 3, this.pos.y, px * 3, py);
        }
        c.fillStyle = "#14212b";
        c.fillRect(this.pos.x + px * 2, this.pos.y + py * 2, px, py);
        c.fillRect(this.pos.x + px * 5, this.pos.y + py * 2, px, py);
        c.restore();
    }

    update(deltaTime) {
        if (this.dead) return;
        this.tickFeedback(deltaTime);
        this.walkTime += deltaTime * 12;
        this.attackTimer = Math.max(0, this.attackTimer - deltaTime);
        this.strikeFlash = Math.max(0, this.strikeFlash - deltaTime);
        this.shotTimer -= deltaTime;
        this.trailTimer -= deltaTime;
        this.repathTimer -= deltaTime;
        this.moving = false;
        const room = dungeon.room;
        const origin = center(this), target = center(player);
        const distance = dist(origin, target);
        const canReach = distance <= 44 && room.hasLineOfSight(origin, target);
        if (this.windingUp) {
            if (this.attackTimer <= 0) {
                this.strikeFlash = 0.15;
                if (canReach) player.onHit(this.meleeDamage);
                this.windingUp = false;
                this.attackTimer = 0.85;
            }
        } else if (canReach && this.attackTimer <= 0) {
            this.windingUp = true;
            this.attackTimer = 0.4;
        } else {
            const chasing = distance < 280;
            if (!this.path.length || (chasing && this.repathTimer <= 0)) {
                let destination = target;
                if (!chasing) {
                    const floors = room.tiles.filter(tile => tile.walkable);
                    const tile = floors[Math.floor(Math.random() * floors.length)];
                    if (tile) destination = { x: tile.x + tile.size / 2, y: tile.y + tile.size / 2 };
                }
                this.path = room.findPath(this, destination);
                this.repathTimer = 0.65;
            }
            let budget = this.speed * 60 * deltaTime;
            while (this.path.length && budget > 0) {
                const waypoint = this.path[0], here = center(this);
                const length = dist(here, waypoint);
                if (length < 0.01) { this.path.shift(); continue; }
                const step = Math.min(budget, length);
                const before = { ...this.pos };
                room.moveActor(this, (waypoint.x - here.x) / length * step, (waypoint.y - here.y) / length * step);
                const moved = dist(before, this.pos);
                this.moving ||= moved > 0.01;
                if (moved < step - 0.01) { this.path = []; break; }
                budget -= step;
                if (step >= length) this.path.shift();
            }
        }
        // Goo remains a slowing hazard; timed shots replace per-frame random firing.
        if (!this.windingUp && this.shotTimer <= 0 && distance < 280 && room.hasLineOfSight(origin, target)) {
            const length = distance || 1;
            arrows.push(new GooShot(origin.x, origin.y, { x: (target.x - origin.x) / length, y: (target.y - origin.y) / length }, this.element));
            this.shotTimer = (2.5 + Math.random() * 1.5) * this.shotRate;
        }
        if (this.element !== "goo" && this.moving && this.trailTimer <= 0) {
            spawnHazard(room, center(this), this.element);
            this.trailTimer = 2.4;
        }
        this.draw();
        this.drawHealth();
    }
}

/* ================= ENEMY PROJECTILE (GOO) ================= */
function spawnHazard(room, point, element) {
    // Impact positions can be inside walls: place patches on the closest walkable tile.
    let tile = room.getTile(Math.floor(point.x / room.tileSize), Math.floor(point.y / room.tileSize));
    if (!tile?.walkable) {
        tile = room.tiles.filter(t => t.walkable).reduce((best, candidate) =>
            !best || dist({ x: candidate.x + candidate.size / 2, y: candidate.y + candidate.size / 2 }, point) <
            dist({ x: best.x + best.size / 2, y: best.y + best.size / 2 }, point) ? candidate : best, null);
    }
    if (!tile) return;
    const existing = room.entities.find(entity => entity instanceof GooPuddle && !entity.dead &&
        entity.element === element && entity.pos.x === tile.x + 2 && entity.pos.y === tile.y + 2);
    if (existing) { existing.timer = 6; return; }
    room.entities.push(new GooPuddle(tile.x + 2, tile.y + 2, element));
}

class GooShot extends Entity {
    constructor(x, y, dir, element = "goo") {
        super(x, y, 10, 10, SLIME_TYPES[element].light);
        this.element = element;
        this.vel = { x: dir.x * 3, y: dir.y * 3 };
    }
    update(deltaTime) {
        if (this.dead) return;
        const dx = this.vel.x * deltaTime * 60, dy = this.vel.y * deltaTime * 60;
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4));
        for (let i = 0; i < steps; i++) {
            const before = { ...this.pos };
            this.pos.x += dx / steps;
            this.pos.y += dy / steps;
            if (!dungeon.room.isWalkable(this.pos.x, this.pos.y, this.width, this.height)) {
                spawnHazard(dungeon.room, before, this.element);
                this.destroy();
                break;
            }
            if (this.pos.x < player.pos.x + player.width && this.pos.x + this.width > player.pos.x &&
                this.pos.y < player.pos.y + player.height && this.pos.y + this.height > player.pos.y) {
                player.onHit(6);
                spawnHazard(dungeon.room, center(this), this.element);
                this.destroy();
                break;
            }
        }
        this.draw();
    }
}

class GooPuddle extends Entity {
    constructor(x, y, element = "goo") {
        super(x, y, 36, 36, SLIME_TYPES[element].body);
        this.element = element;
        this.timer = 6;
    }
    draw() {
        const { x, y } = this.pos;
        const palette = SLIME_TYPES[this.element];
        c.save();
        c.globalAlpha = Math.min(1, this.timer);
        c.fillStyle = palette.dark;
        c.fillRect(x + 4, y + 2, 28, 32);
        c.fillRect(x + 1, y + 7, 34, 22);
        c.fillStyle = palette.body;
        c.fillRect(x + 5, y + 7, 26, 22);
        c.fillStyle = palette.light;
        if (this.element === "fire") {
            for (let i = 0; i < 3; i++) {
                const flicker = Math.floor((6 - this.timer) * 7 + i) % 3;
                c.fillRect(x + 7 + i * 9, y + 12 - flicker * 3, 4, 14 + flicker * 3);
                c.fillRect(x + 8 + i * 9, y + 8 - flicker * 3, 2, 6);
            }
        } else {
            c.fillRect(x + 7, y + 10, 12, 2);
            c.fillRect(x + 17, y + 22, 11, 2);
            if (this.element === "water") {
                c.fillRect(x + 9, y + 28, 8, 1);
                c.fillRect(x + 25, y + 8, 2, 3);
            }
        }
        c.restore();
    }
    update(deltaTime) {
        this.timer -= deltaTime;
        if (this.timer <= 0) { this.destroy(); return; }
        if (player.pos.x < this.pos.x + this.width && player.pos.x + player.width > this.pos.x &&
            player.pos.y < this.pos.y + this.height && player.pos.y + player.height > this.pos.y) {
            if (this.element === "fire") {
                player.inFire = true;
                if (player.fireCooldown <= 0 && player.onHit(8)) player.fireCooldown = 0.9;
            } else if (this.element === "water") player.onWater = true;
            else player.speedModifier = 0.5;
        }
        this.draw();
    }
}
/* ================= CHEST ================= */

class Chest extends Entity {
    constructor(x, y) { super(x, y, 32, 32, "gold"); }
    draw() {
        c.drawImage(chestImg, this.pos.x, this.pos.y, this.width, this.height);
    }
    update(deltaTime) {
        if (dist(this.pos, player.pos) < 30 && !goldpickup) {
            goldCollected += 50;
            updateUI("Found 50 gold!");
            goldpickup = true;
        }
        this.draw();
    }
}

/* ================= DOOR ================= */

class Door {
    constructor(x, y) { this.x = x; this.y = y; this.w = 40; this.h = 80; this.armed = true; }
    draw() {
        const { x, y, w, h } = this;
        c.save();
        c.fillStyle = "#101b21";
        c.fillRect(x - 4, y - 5, w + 4, h + 9);
        c.fillStyle = "#637475";
        c.fillRect(x, y + 7, 6, h - 7);
        c.fillRect(x + w - 6, y + 7, 6, h - 7);
        c.fillRect(x + 5, y, w - 10, 8);
        c.fillRect(x + 10, y - 5, w - 20, 6);
        c.fillStyle = "#9b9c80";
        c.fillRect(x + 7, y, w - 14, 2);
        for (let row = 0; row < 4; row++) {
            c.fillStyle = "#35494c";
            c.fillRect(x, y + 20 + row * 17, 6, 2);
            c.fillRect(x + w - 6, y + 20 + row * 17, 6, 2);
        }
        c.fillStyle = "#2c2521";
        c.fillRect(x + 6, y + 9, w - 12, h - 10);
        for (let col = 0; col < 4; col++) {
            c.fillStyle = col % 2 ? "#71503b" : "#825d40";
            c.fillRect(x + 7 + col * 7, y + 9, 6, h - 12);
        }
        c.fillStyle = "#bc9758";
        c.fillRect(x + 6, y + 23, w - 12, 3);
        c.fillRect(x + 6, y + 58, w - 12, 3);
        c.fillStyle = "#182b2d";
        c.fillRect(x + 18, y + 31, 11, 16);
        c.strokeStyle = "#91e0ba";
        c.shadowColor = "#8fdfad";
        c.shadowBlur = 10;
        c.lineWidth = 2;
        c.beginPath();c.moveTo(x + 23, y + 34);c.lineTo(x + 27, y + 39);
        c.lineTo(x + 23, y + 44);c.lineTo(x + 19, y + 39);c.closePath();c.stroke();
        c.fillStyle = "#a9d7b2";
        c.fillRect(x + 2, y + h, w - 4, 3);
        c.shadowBlur = 0;
        c.font = "bold 8px monospace";
        c.textAlign = "center";
        c.fillStyle = "#dbd3a4";
        c.fillText("DESCEND", x + w / 2, y - 10);
        c.strokeStyle = "#b5c79a";
        c.beginPath();c.moveTo(x - 15, y + 35);c.lineTo(x - 10, y + 40);c.lineTo(x - 15, y + 45);c.stroke();
        c.restore();
    }
    update() {
        const near = player.pos.x + player.width > this.x - 5 && player.pos.y < this.y + this.h && player.pos.y + player.height > this.y;
        if (!near) this.armed = true;
        if (!isGameOver && !shopOpen && player.health > 0 && near && this.armed) {
            this.armed = false;
            openFloorShop();
        }
    }
}

/* ================= FLOOR SHOP ================= */
const SHOP_OFFERS = {
    vitality: { cost: 25, name: "Heartstone" },
    damage: { cost: 50, name: "Honed Steel" },
    storm: { cost: 150, name: "Storm Spark" },
    fire: { cost: 150, name: "Fire Ring" }
};

function updateShop() {
    document.getElementById("shop-gold").textContent = goldCollected - goldSpent;
    document.getElementById("shop-floor").textContent = "FLOOR " + dungeon.floor + " → " + (dungeon.floor + 1);
    for (const [id, offer] of Object.entries(SHOP_OFFERS)) {
        const button = document.getElementById("buy-" + id);
        const owned = (id === "storm" && player.stormSpark) || (id === "fire" && player.fireRing);
        const available = !["storm", "fire"].includes(id) || dungeon.perkOffer === id;
        if (["storm", "fire"].includes(id)) document.getElementById("offer-" + id).hidden = !available;
        button.disabled = dungeon.shopPurchased || !available || owned || goldCollected - goldSpent < offer.cost;
        button.textContent = owned ? "OWNED" : dungeon.shopPurchased ? "PURCHASE USED" : "BUY · " + offer.cost + " GOLD";
    }
}

function openFloorShop() {
    if (shopOpen || isGameOver || player.health <= 0) return;
    shopOpen = true;
    resetKeys();
    updateShop();
    document.getElementById("shop-message").textContent = "One upgrade per floor. Descending restores 30 HP.";
    document.getElementById("floor-shop").showModal();
}

function buyUpgrade(id) {
    const offer = Object.hasOwn(SHOP_OFFERS, id) ? SHOP_OFFERS[id] : null;
    if (!shopOpen || dungeon.shopPurchased || !offer || goldCollected - goldSpent < offer.cost ||
        (["storm", "fire"].includes(id) && dungeon.perkOffer !== id) ||
        (id === "storm" && player.stormSpark) || (id === "fire" && player.fireRing)) return false;
    goldSpent += offer.cost;
    dungeon.shopPurchased = true;
    if (id === "vitality") player.maxHealth += 5;
    if (id === "damage") {
        player.damageBonus += 5;
        player.inventory.weapons.forEach(weapon => weapon.damage += 5);
    }
    if (id === "storm") player.stormSpark = true;
    if (id === "fire") player.fireRing = true;
    document.getElementById("shop-message").textContent = offer.name + " acquired! " +
        "Your purchase for this floor is used. Descend or return to explore.";
    updateShop();
    updateUI();
    return true;
}

function returnToFloor() {
    if (!shopOpen) return;
    shopOpen = false;
    document.getElementById("floor-shop").close();
    resetKeys();
    // The used door stays disarmed until you step away, avoiding an immediate reopen.
    updateUI("Back to the floor. Step away from the door before returning.");
}

function leaveFloor() {
    if (!shopOpen) return;
    shopOpen = false;
    document.getElementById("floor-shop").close();
    resetKeys();
    dungeon.nextLevel();
    arrows = [];
    effects = [];
    player.swing = null;
    player.onWater = false;
    player.inFire = false;
    player.sliding = false;
    player.slideTime = 0;
    player.slideVelocity = { x: 0, y: 0 };
    player.slowed = false;
    player.speedModifier = 1;
    player.fireCooldown = 0;
    player.health = Math.min(player.maxHealth, player.health + 30);
    player.ringTime = 0;
    player.ringCooldown = 0;
    player.ringPulse = 0;
    updateUI("Entering floor " + dungeon.floor + ". Slimes are stronger here.");
}

/* ================= GAME ENGINE ================= */

let dungeon, player, arrows;
let lastTime = performance.now();

function initGame() {
    isGameOver = false;
    enemiesSlain = 0;
    goldCollected = 0;
    goldSpent = 0;
    shopOpen = false;
    const shop = document.getElementById("floor-shop");
    if (shop.open) shop.close();
    arrows = [];
    effects = [];
    difficulty = 1;
    hasBow = false;
    runTime = 0;
    resetKeys();
    lastTime = performance.now();
    player = null;
    dungeon = new Dungeon();
    const start = dungeon.spawn;
    player = new Player(start.x, start.y);
    updateUI("Explore, fight, or find the next floor.");
    updateLeaderboardUI();
}

function animate(time = performance.now()) {
    let deltaTime = (time - lastTime) / 1000;
    lastTime = time;

    // Safety Cap to prevent teleporting during lag/tab-switching
    if (deltaTime > 0.1) deltaTime = 0.1;

    c.clearRect(0, 0, canvas.width, canvas.height);

    if (!isGameOver && !shopOpen) {
        runTime += deltaTime;
        dungeon.room.update(deltaTime);
        player.update(deltaTime);
        for (let i = arrows.length - 1; i >= 0; i--) {
            arrows[i].update(deltaTime);
            if (arrows[i].dead) arrows.splice(i, 1);
        }
        if (player.health <= 0) {
            isGameOver = true;
            resetKeys();
            onGameOver();
        } else {
            dungeon.room.doors.forEach(door => door.update());
        }
    } else {
        dungeon.room.draw();
        player.draw();
    }
    player.drawSwing();
    if (player.hitFlash > 0) {
        c.save();
        c.strokeStyle = "rgba(255,70,70," + (player.hitFlash / 0.18) + ")";
        c.lineWidth = 8;
        c.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
        c.restore();
    }
    drawEffects(isGameOver || shopOpen ? 0 : deltaTime);
    const viewport = document.getElementById("game-viewport");
    if (viewport?.clientWidth > 0 && (canvas.clientWidth > viewport.clientWidth || canvas.clientHeight > viewport.clientHeight)) {
        const scale = canvas.clientWidth / canvas.width;
        const focus = center(player);
        viewport.scrollLeft = focus.x * scale - viewport.clientWidth / 2;
        viewport.scrollTop = focus.y * scale - viewport.clientHeight / 2;
    }
    updateStats();
    requestAnimationFrame(animate);
}

function onGameOver() {
    const overlay = document.getElementById("game-over-overlay");
    const scoreDisplay = document.getElementById("final-score");
    if (scoreDisplay) scoreDisplay.innerText = enemiesSlain;
    if (overlay) overlay.style.display = "block";
}

async function submit() {
    if (submitting) return;
    submitting = true;
    const button = document.getElementById("submit-btn");
    const retryButton = document.getElementById("retry-btn");
    button.disabled = true;
    retryButton.disabled = true;
    button.textContent = "SAVING…";
    const nameInput = document.getElementById("player-name");
    const name = nameInput.value.trim().slice(0, 10) || "Unknown";
    const entry = { name, score: enemiesSlain, gold: goldCollected };
    // Always keep a local backup. Offline records are never automatically uploaded later.
    saveLocalScore(entry);
    leaderboardRequest++; // Invalidate any older leaderboard load.
    let message;
    try {
        await apiRequest("submit-score", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: name, score: entry.score, gold: entry.gold })
        });
        await loadLeaderboardFromServer();
        message = storageAvailable ? "Score submitted online. A local backup is also saved." :
            "Score submitted online. Backup available for this session only.";
    } catch {
        useLocalLeaderboard();
        message = storageAvailable ? "Online leaderboard unavailable. Score saved in this browser." :
            "Online saving and browser storage unavailable. Score kept for this session only.";
    } finally {
        submitting = false;
        button.disabled = false;
        retryButton.disabled = false;
        button.textContent = "SUBMIT";
    }
    document.getElementById("game-over-overlay").style.display = "none";
    nameInput.value = "";
    initGame();
    updateUI(message);
}

async function retry() {
    if (submitting) return;
    document.getElementById("game-over-overlay").style.display = "none";
    initGame();
    loadLeaderboardFromServer();
}

async function loadLeaderboardFromServer() {
    const request = ++leaderboardRequest;
    try {
        const data = await apiRequest("leaderboard");
        if (!Array.isArray(data) || !data.every(validScore)) throw new Error("Invalid leaderboard response");
        if (request !== leaderboardRequest) return;
        leaderboardData = rankedScores(data);
        leaderboardMode = "online";
        updateLeaderboardUI();
    } catch {
        if (request === leaderboardRequest) useLocalLeaderboard();
    }
}

// Event Listeners
const subBtn = document.getElementById("submit-btn");
const retBtn = document.getElementById("retry-btn");
if (subBtn) subBtn.addEventListener("click", submit);
if (retBtn) retBtn.addEventListener("click", retry);

for (const id of Object.keys(SHOP_OFFERS)) document.getElementById("buy-" + id).addEventListener("click", () => buyUpgrade(id));
document.getElementById("shop-continue").addEventListener("click", leaveFloor);
document.getElementById("shop-return").addEventListener("click", returnToFloor);
document.getElementById("floor-shop").addEventListener("cancel", event => { event.preventDefault(); returnToFloor(); });

// Start Game
initGame();
loadLeaderboardFromServer();
requestAnimationFrame(animate);
