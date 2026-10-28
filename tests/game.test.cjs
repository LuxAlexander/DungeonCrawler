const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../frontend/game.js'), 'utf8');

function game(options = {}) {
    const storage = options.storage || new Map();
    const elements = new Map();
    const listeners = {};
    const calls = [];
    const drawing = new Proxy({}, { get: (_, method) => (...args) => calls.push([method, ...args]) });
    const canvas = { getContext: () => drawing };
    const document = {
        hidden: false,
        addEventListener(name, handler) { listeners[name] = handler; },
        querySelector: () => canvas,
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, {
                textContent: '', innerText: '', innerHTML: '', value: '', style: {}, children: [],
                addEventListener() {}, appendChild(child) { this.children.push(child); }, replaceChildren() { this.children = []; }
            });
            return elements.get(id);
        },
        createElement: tag => tag === "canvas" ? { getContext: () => drawing } : ({ children: [], appendChild(child) { this.children.push(child); } })
    };
    const context = vm.createContext({
        document, Image: class {}, performance: { now: () => 0 },
        window: { addEventListener(name, handler) { listeners[name] = handler; } },
        requestAnimationFrame() {}, console: { log() {}, error() {} },
        // No external network access or real leaderboard submissions in tests.
        fetch: options.fetch || (async () => { throw new Error('Mock offline'); }),
        AbortController, setTimeout: options.setTimeout || setTimeout, clearTimeout,
        localStorage: options.localStorage || { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) }
    });
    vm.runInContext(source, context);
    return { run: code => vm.runInContext(code, context), elements, listeners, canvas, storage, calls };
}

const arena = `
    dungeon.currentRoom = Object.create(Room.prototype);
    Object.assign(dungeon.room, { cols: 10, rows: 10, tileSize: 40, tiles: [], entities: [], doors: [] });
    player.pos = { x: 55, y: 50 };
`;

test('diagonal movement slides along a wall instead of stopping both axes', () => {
    const g = game();
    g.run(arena + `dungeon.room.tiles = [new Tile(80, 0, 400, false)]; keys.right = true; keys.down = true; player.movement(1/60);`);
    assert.equal(g.run('player.pos.x'), 55);
    assert(g.run('player.pos.y') > 50);
    assert.equal(g.run('player.dir.x'), 0);
    assert.equal(g.run('player.dir.y'), 1);
});

test('slide along horizontal walls and stop at closed corners', () => {
    const g = game();
    g.run(arena + `player.pos.y = 60; dungeon.room.tiles = [new Tile(0, 80, 400, false)]; dungeon.room.moveActor(player, 10, 10);`);
    assert.equal(g.run('player.pos.x'), 65);
    assert.equal(g.run('player.pos.y'), 60);
    g.run(`dungeon.room.tiles.push(new Tile(90, 0, 400, false)); dungeon.room.moveActor(player, 10, 10);`);
    assert.equal(g.run('player.pos.x'), 65);
    assert.equal(g.run('player.pos.y'), 60);
});

test('swept movement cannot tunnel through walls in either direction', () => {
    const g = game();
    g.run(arena + `dungeon.room.tiles = [new Tile(120, 40, 40, false)]; dungeon.room.moveActor(player, 300, 0);`);
    assert.equal(g.run('player.pos.x'), 95);
    g.run(`player.pos.x = 200; dungeon.room.moveActor(player, -300, 0);`);
    assert.equal(g.run('player.pos.x'), 160);
});

test('world bounds block actors and projectiles; canvas fits all maze rows', () => {
    const g = game();
    assert.equal(g.canvas.height, g.run('dungeon.room.rows * dungeon.room.tileSize'));
    g.run(arena + `dungeon.room.moveActor(player, -1000, -1000);`);
    assert.equal(g.run('player.pos.x'), 0);
    assert.equal(g.run('player.pos.y'), 0);
    g.run('dungeon.room.moveActor(player, 1000, 1000)');
    assert.equal(g.run('player.pos.x'), 375);
    assert.equal(g.run('player.pos.y'), 380);
    assert.equal(g.run('dungeon.room.isWalkable(-1, 0, 8, 4)'), false);
});

test('diagonal movement has the same speed as cardinal movement', () => {
    const g = game();
    g.run(arena + 'keys.right = true; keys.down = true; player.movement(1/60);');
    assert(Math.abs(g.run('Math.hypot(player.pos.x - 55, player.pos.y - 50)') - 4) < 1e-9);
});

test('live stats reflect damage, goo slowing, weapon switching and dead enemies', () => {
    const g = game();
    g.run(arena + `player.onHit(25); player.speedModifier = 0.5; player.movement(0); player.inventory.weapons.push(new Bow()); player.inventory.index = 1; const deadEnemy = new Enemy(0,0); deadEnemy.dead = true; dungeon.room.entities = [deadEnemy, new Enemy(100,100)]; updateStats();`);
    for (const [id, expected] of Object.entries({ 'health-stat': '75 / 100', 'hp-count': '75', 'weapon-stat': 'Bow', 'damage-stat': '20', 'speed-stat': '120 px/s', 'status-stat': 'Slowed', 'remaining-count': '1' })) {
        assert.equal(String(g.elements.get(id).textContent), expected, id);
    }
});

test('floor transitions heal and clear projectiles after simulation', () => {
    const g = game();
    g.run(`player.pos = {x: 935, y: 220}; player.health = 30; arrows.push(new Arrow(100,100,{x:1,y:0})); dungeon.room.doors[0].update();`);
    assert.equal(g.run('dungeon.floor'), 2);
    assert.equal(g.run('player.health'), 100);
    assert.equal(g.run('arrows.length'), 0);
    assert.equal(String(g.elements.get('floor-count').textContent), '2');
});

test('death freezes the simulation and run timer; retry resets run state', () => {
    const g = game();
    g.run(`player.health = 0; animate(16);`);
    assert.equal(g.run('isGameOver'), true);
    assert.equal(g.elements.get('game-over-overlay').style.display, 'block');
    const time = g.run('runTime');
    g.run(`dungeon.room.update = () => { throw new Error('Must not simulate after death'); }; animate(32);`);
    assert.equal(g.run('runTime'), time);
    g.run(`difficulty = 4; hasBow = true; keys.right = true; runTime = 100; initGame();`);
    assert.equal(g.run('difficulty'), 1);
    assert.equal(g.run('hasBow'), false);
    assert.equal(g.run('keys.right'), false);
    assert.equal(g.run('runTime'), 0);
    assert.equal(g.run('dungeon.floor'), 1);
});

test('uppercase controls work, focus loss resets input, and name input is ignored', () => {
    const g = game();
    let prevented = false;
    g.listeners.keydown({ key: 'W', preventDefault() { prevented = true; } });
    assert.equal(g.run('keys.up'), true);
    assert.equal(prevented, true);
    g.listeners.blur();
    assert.equal(g.run('keys.up'), false);
    g.listeners.keydown({ key: 'a', target: { closest: () => ({}) }, preventDefault() { throw new Error('Must allow typing'); } });
    assert.equal(g.run('keys.left'), false);
});

test('sword hits its forward arc once, not enemies behind or through walls', () => {
    const g = game();
    g.run(arena + `
        player.pos = {x:100,y:100}; player.dir = {x:1,y:0};
        const front = new Enemy(140,95), behind = new Enemy(60,95);
        dungeon.room.entities = [front, behind]; player.weapon.attack(player,dungeon.room);
    `);
    assert.equal(g.run('front.health'), 75);
    assert.equal(g.run('behind.health'), 100);
    assert(g.run('player.swing.remaining') > 0);
    g.run('player.drawSwing(); player.drawSwing();');
    assert.equal(g.run('front.health'), 75);
    g.run(`dungeon.room.tiles = [new Tile(130,100,20,false)]; front.pos = {x:145,y:95}; player.weapon.attack(player,dungeon.room);`);
    assert.equal(g.run('front.health'), 75);
});

test('damage produces flashes and floating numbers; dead enemies cannot score twice', () => {
    const g = game();
    g.run(arena + `const victim = new Enemy(100,100); victim.onHit(25);`);
    assert(g.run('victim.hitFlash') > 0);
    assert.equal(g.run('effects[0].text'), '−25');
    g.run('victim.onHit(100); victim.onHit(100); drawEffects(0.1);');
    assert.equal(g.run('enemiesSlain'), 1);
    assert(g.calls.some(call => call[0] === 'fillText' && call[1] === '−25'));
});

test('slime contact is telegraphed, discrete, and followed by a cooldown', () => {
    const g = game();
    g.run(arena + `const attacker = new Enemy(70,50); attacker.update(0.01);`);
    assert.equal(g.run('attacker.windingUp'), true);
    assert.equal(g.run('player.health'), 100);
    assert(g.calls.some(call => call[0] === 'fillText' && call[1] === '!'));
    g.run('attacker.update(0.39);');
    assert.equal(g.run('player.health'), 100);
    g.run('attacker.update(0.02);');
    assert.equal(g.run('player.health'), 88);
    g.run('attacker.update(0.1); attacker.update(0.1);');
    assert.equal(g.run('player.health'), 88);
});

test('dodging out of a warned attack avoids damage, and walls block it', () => {
    const g = game();
    g.run(arena + `const attacker = new Enemy(70,50); attacker.update(0.01); player.pos.x = 200; attacker.update(0.41);`);
    assert.equal(g.run('player.health'), 100);
    g.run(`player.pos.x = 55; attacker.attackTimer = 0; dungeon.room.tiles = [new Tile(76,58,8,false)]; attacker.update(0.01);`);
    assert.equal(g.run('attacker.windingUp'), false);
});

test('player invulnerability protects against simultaneous hits and then expires', () => {
    const g = game();
    g.run(arena + 'player.onHit(12); player.onHit(12);');
    assert.equal(g.run('player.health'), 88);
    g.run('player.update(0.71); player.onHit(12);');
    assert.equal(g.run('player.health'), 76);
});

test('slimes navigate around a wall without clipping or becoming stuck', () => {
    const g = game();
    g.run(`
        dungeon.currentRoom = new Room(9,9,40);
        for (const tile of dungeon.room.tiles) {
            const col=tile.x/40,row=tile.y/40;
            tile.walkable = col>0 && col<8 && row>0 && row<8 && !(col===4 && row<=5);
        }
        const walker = new Enemy(82.5,125);
        player.pos={x:247.5,y:130};
        let clipped=false;
        for(let i=0;i<600;i++) {
            walker.update(1/60);
            if(!dungeon.room.isWalkable(walker.pos.x,walker.pos.y,walker.width,walker.height))clipped=true;
        }
    `);
    assert.equal(g.run('clipped'), false);
    assert(g.run('dist(center(walker),center(player))') <= 44, 'enemy should reach attack distance around the wall');
});

test('one arrow cannot damage multiple overlapping enemies', () => {
    const g = game();
    g.run(arena + `const first=new Enemy(100,100),second=new Enemy(100,100); dungeon.room.entities=[first,second]; const arrow=new Arrow(100,100,{x:0,y:0}); arrow.update(0);`);
    assert.equal(g.run('first.health'), 80);
    assert.equal(g.run('second.health'), 100);
});

test('offline scores persist across game instances and sort by kills then gold', async () => {
    const g = game();
    await g.run('loadLeaderboardFromServer()');
    g.run('document.getElementById("player-name").value = "  Penguin  ";');
    g.run('enemiesSlain=12; goldCollected=50; isGameOver=true;');
    await g.run('submit()');
    assert.equal(g.run('localScores[0].name'), 'Penguin');
    assert.equal(g.run('leaderboardMode'), 'local');
    assert.equal(g.run('isGameOver'), false);
    const next = game({ storage: g.storage });
    assert.equal(next.run('localScores[0].score'), 12);
    next.run('saveLocalScore({name:"Better",score:12,gold:100});');
    assert.equal(next.run('localScores[0].name'), 'Better');
    assert.match(next.elements.get('leaderboard-status').textContent, /Local/);
});

test('local board handles corrupt data, caps top ten, and renders names as text', () => {
    const storage=new Map([['dungeoncrawler.scores.v1','broken JSON']]);
    const g = game({storage});
    g.run(`for(let i=0;i<15;i++)saveLocalScore({name:'Player'+i,score:i,gold:0}); saveLocalScore({name:'<img src=x',score:100,gold:0}); useLocalLeaderboard();`);
    assert.equal(g.run('localScores.length'),10);
    const first=g.elements.get('leaderboard-list').children[0];
    assert.equal(first.children[0].textContent,'1. <img src=x');
    assert.equal(first.children[0].children.length,0);
    assert.equal(g.elements.get('leaderboard-list').children.length,10);
});

test('unavailable browser storage keeps an honest session-only fallback', async () => {
    const g=game({localStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});
    await g.run('submit()');
    assert.equal(g.run('localScores.length'),1);
    assert.match(g.elements.get('leaderboard-status').textContent,/session only/);
    assert.equal(g.elements.get('submit-btn').disabled,false);
});

test('HTTP errors and malformed API payloads fall back to local scores', async () => {
    for(const response of [{ok:false,status:500},{ok:true,json:async()=>({error:'not an array'})},{ok:true,json:async()=>[{name:'Bad',score:-1}]}]){
        const g=game({fetch:async()=>response});
        g.run('saveLocalScore({name:"Local",score:5,gold:10});');
        await g.run('loadLeaderboardFromServer()');
        assert.equal(g.run('leaderboardMode'),'local');
        assert.equal(g.run('leaderboardData[0].score'),5);
    }
});

test('API recovery switches online without uploading historical local scores', async () => {
    const calls=[];
    const g=game({fetch:async(url,options)=>{calls.push(options.method||'GET');return {ok:true,json:async()=>[{name:'Online',score:22,gold:5}]};}});
    g.run('saveLocalScore({name:"Offline",score:10,gold:0});');
    await g.run('loadLeaderboardFromServer()');
    assert.equal(g.run('leaderboardMode'),'online');
    assert.equal(g.run('leaderboardData[0].name'),'Online');
    assert.equal(g.run('localScores[0].name'),'Offline');
    assert(calls.every(method=>method==='GET'));
});

test('double submission saves once and POST uses the existing backend contract', async () => {
    let finish;const posts=[];
    const g=game({fetch:async(url,options)=>{
        if(options.method==='POST'){posts.push(JSON.parse(options.body));await new Promise(resolve=>finish=resolve);return {ok:true};}
        return {ok:true,json:async()=>[]};
    }});
    g.run('document.getElementById("player-name").value = "Ada";');
    g.run('enemiesSlain=7; goldCollected=50;');
    const first=g.run('submit()');
    await g.run('submit()');
    assert.equal(g.run('localScores.length'),1);
    assert.equal(posts.length,1);
    assert.deepEqual(posts[0],{username:'Ada',score:7,gold:50});
    finish();await first;
    assert.equal(g.elements.get('submit-btn').disabled,false);
});

test('request deadline aborts hanging API calls and restores local mode', async () => {
    const g=game({
        setTimeout: callback=>{queueMicrotask(callback);return undefined;},
        fetch:async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))))
    });
    await g.run('loadLeaderboardFromServer()');
    assert.equal(g.run('leaderboardMode'),'local');
    await g.run('submit()');
    assert.equal(g.run('localScores.length'),1);
    assert.equal(g.elements.get('submit-btn').disabled,false);
});

test('an older API load cannot overwrite a newer local result', async () => {
    const pending=[];
    const g=game({fetch:()=>new Promise(resolve=>pending.push(resolve))});
    const newest=g.run('loadLeaderboardFromServer()');
    pending[1]({ok:false,status:503});await newest;
    pending[0]({ok:true,json:async()=>[{name:'Stale',score:99}]});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(g.run('leaderboardMode'),'local');
});

test('every floor includes moss, fire and water slimes without increasing enemy count', () => {
    const g=game();
    assert.equal(g.run('dungeon.room.entities.filter(e=>e instanceof Enemy).length'),4);
    for(const element of ['goo','fire','water'])assert.equal(g.run(`dungeon.room.entities.some(e=>e instanceof Enemy && e.element===${JSON.stringify(element)})`),true);
});

test('fire burns in visible pulses rather than draining health every frame', () => {
    const g=game();
    g.run(arena+`const flame=new GooPuddle(55,50,'fire'); flame.update(0.01); flame.update(0.01);`);
    assert.equal(g.run('player.health'),92);
    assert.equal(g.run('player.inFire'),true);
    assert.equal(g.run('effects[0].text'),'−8');
    g.run(`for(let i=0;i<11;i++){player.update(0.1);flame.update(0.1);}`);
    assert.equal(g.run('player.health'),84);
});

test('expired fire cannot damage and water never directly damages', () => {
    const g=game();
    g.run(arena+`const expired=new GooPuddle(55,50,'fire');expired.timer=0.01;expired.update(0.02);const water=new GooPuddle(55,50,'water');water.update(0.1);`);
    assert.equal(g.run('expired.dead'),true);
    assert.equal(g.run('player.health'),100);
    assert.equal(g.run('player.onWater'),true);
});

test('water carries the player forward and momentum decays after leaving', () => {
    const g=game();
    g.run(arena+`player.dir={x:1,y:0};player.onWater=true;player.movement(0.1);`);
    assert(g.run('player.pos.x')>55);
    assert.equal(g.run('player.sliding'),true);
    const before=g.run('player.pos.x');
    g.run('player.onWater=false;player.movement(0.1);');
    assert(g.run('player.pos.x')>before);
    g.run('for(let i=0;i<6;i++)player.movement(0.1);');
    assert.equal(g.run('player.sliding'),false);
    const stopped=g.run('player.pos.x');g.run('player.movement(0.1)');
    assert.equal(g.run('player.pos.x'),stopped);
});

test('water slide respects walls and clears blocked momentum', () => {
    const g=game();
    g.run(arena+`dungeon.room.tiles=[new Tile(80,0,400,false)];player.onWater=true;player.movement(0.1);`);
    assert.equal(g.run('player.pos.x'),55);
    assert.equal(g.run('player.slideVelocity.x'),0);
});

test('hazards land on walkable tiles, stay inside them, and refresh instead of stacking', () => {
    const g=game();
    g.run(`dungeon.currentRoom=new Room(9,9,40);const floor=dungeon.room.tiles.find(t=>t.walkable);spawnHazard(dungeon.room,{x:floor.x+20,y:floor.y+20},'fire');spawnHazard(dungeon.room,{x:floor.x+20,y:floor.y+20},'fire');const patch=dungeon.room.entities.find(e=>e instanceof GooPuddle);`);
    assert.equal(g.run('dungeon.room.entities.filter(e=>e instanceof GooPuddle).length'),1);
    assert.equal(g.run('dungeon.room.isWalkable(patch.pos.x,patch.pos.y,patch.width,patch.height)'),true);
    g.run(`spawnHazard(dungeon.room,{x:0,y:0},'water');const waterPatch=dungeon.room.entities.find(e=>e.element==='water');`);
    assert.equal(g.run('dungeon.room.isWalkable(waterPatch.pos.x,waterPatch.pos.y,waterPatch.width,waterPatch.height)'),true);
});

test('defeating elemental slimes leaves their matching patch', () => {
    const g=game();
    g.run(`const ember=dungeon.room.entities.find(e=>e instanceof Enemy && e.element==='fire');ember.onHit(1000);`);
    assert.equal(g.run('dungeon.room.entities.some(e=>e instanceof GooPuddle && e.element===\'fire\')'),true);
});

test('floor transitions remove water momentum, burning and slow state', () => {
    const g=game();
    g.run(`player.pos={x:935,y:220};player.onWater=true;player.inFire=true;player.sliding=true;player.slideTime=0.45;player.slideVelocity={x:300,y:0};player.slowed=true;player.fireCooldown=0.8;dungeon.room.doors[0].update();`);
    assert.equal(g.run('player.sliding || player.inFire || player.onWater || player.slowed'),false);
    assert.equal(g.run('player.slideVelocity.x'),0);
    assert.equal(g.run('player.fireCooldown'),0);
});

test('HUD reflects health, depth and terrain conditions', () => {
    const g=game();
    g.run('player.health=24;player.inFire=true;player.sliding=true;player.slideVelocity={x:300,y:0};updateStats();');
    assert.equal(g.elements.get('health-meter').value,24);
    assert.equal(g.elements.get('health-meter').className,'health-meter critical');
    assert.equal(g.elements.get('floor-badge').textContent,'DEPTH 01');
    assert.equal(g.elements.get('status-stat').textContent,'Burning · Sliding');
});

test('decorated terrain is cached instead of repainting tiles on every frame', () => {
    const g=game();
    g.run('let tilePaints=0;dungeon.room.tiles[0].draw=()=>tilePaints++;dungeon.room.drawTerrain();dungeon.room.drawTerrain();');
    assert.equal(g.run('tilePaints'),1);
});

test('health pickup cannot revive a player killed by fire earlier in the frame', () => {
    const g=game();
    g.run(`const spot=dungeon.room.getSafePos();player.pos={...spot};player.health=4;dungeon.room.entities=[new GooPuddle(spot.x,spot.y,'fire'),new Item(spot.x,spot.y,'health')];dungeon.room.update(0.01);player.update(0.01);`);
    assert.equal(g.run('player.health'),0);
    assert.equal(g.run('isGameOver'),true);
});
