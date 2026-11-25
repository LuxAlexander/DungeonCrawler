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
                showModal() { this.open=true; }, close() { this.open=false; },
                handlers: {}, capture: null,
                addEventListener(name, handler) { this.handlers[name] = handler; },
                getBoundingClientRect() { return { left: 0, top: 0, width: 108, height: 108 }; },
                setPointerCapture(id) { this.capture = id; }, hasPointerCapture(id) { return this.capture === id; },
                releasePointerCapture() { this.capture = null; },
                appendChild(child) { this.children.push(child); }, replaceChildren() { this.children = []; }
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
    g.run(arena + `player.onHit(25); player.speedModifier = 0.5; player.movement(0); player.inventory.weapons.push(new Bow());player.inventory.index=1;player.ammo=8; player.inventory.index = 1; const deadEnemy = new Enemy(0,0); deadEnemy.dead = true; dungeon.room.entities = [deadEnemy, new Enemy(100,100)]; updateStats();`);
    for (const [id, expected] of Object.entries({ 'health-stat': '75 / 100', 'hp-count': '75', 'weapon-stat': 'Bow', 'damage-stat': '20', 'speed-stat': '120 px/s', 'status-stat': 'Slowed', 'remaining-count': '1' })) {
        assert.equal(String(g.elements.get(id).textContent), expected, id);
    }
});

test('floor transitions heal and clear projectiles after simulation', () => {
    const g = game();
    g.run(`player.pos = {x: 935, y: 220}; player.health = 30; arrows.push(new Arrow(100,100,{x:1,y:0})); dungeon.room.doors[0].update(); leaveFloor();`);
    assert.equal(g.run('dungeon.floor'), 2);
    assert.equal(g.run('player.health'), 60);
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
    g.run(`player.pos={x:935,y:220};player.onWater=true;player.inFire=true;player.sliding=true;player.slideTime=0.45;player.slideVelocity={x:300,y:0};player.slowed=true;player.fireCooldown=0.8;dungeon.room.doors[0].update(); leaveFloor();`);
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

test('advancing floors scales enemies even when the player rushes without kills', () => {
    const g=game();
    g.run(`const early=dungeon.room.entities.find(e=>e instanceof Enemy);const startSpeed=early.speed;const startRate=early.shotRate;dungeon.nextLevel();const later=dungeon.room.entities.find(e=>e instanceof Enemy);updateStats();`);
    assert.equal(g.run('enemiesSlain'),0);
    assert.equal(g.run('later.maxHealth'),112);
    assert.equal(g.run('later.meleeDamage'),13);
    assert(g.run('later.speed > startSpeed'));
    assert(g.run('later.shotRate < startRate'));
    assert.equal(g.elements.get('enemy-health-scale').textContent,'112%');
    g.run('for(let i=0;i<4;i++)dungeon.nextLevel();');
    assert.equal(g.run('dungeon.floor'),6);
    assert.equal(g.run('dungeon.room.entities.find(e=>e instanceof Enemy).maxHealth'),160);
});

test('killing enemies no longer secretly scales difficulty, and new runs reset depth', () => {
    const g=game();
    g.run('dungeon.room.entities.find(e=>e instanceof Enemy).onHit(1000);');
    assert.equal(g.run('difficulty'),1);
    g.run('dungeon.nextLevel();initGame();');
    assert.equal(g.run('difficulty'),1);
    assert.equal(g.run('dungeon.room.entities.find(e=>e instanceof Enemy).meleeDamage'),12);
});

test('late floors preserve readable warnings and cap movement/shooting acceleration', () => {
    const g=game();
    g.run('dungeon.floor=100;dungeon.nextLevel();const lateEnemy=dungeon.room.entities.find(e=>e instanceof Enemy);');
    assert.equal(g.run('lateEnemy.speed'),2.8);
    assert.equal(g.run('lateEnemy.shotRate'),0.55);
    g.run(arena+'const closeEnemy=new Enemy(70,50);closeEnemy.update(0.01);');
    assert.equal(g.run('closeEnemy.attackTimer'),0.4);
    assert.equal(g.run('player.health'),100);
});

test('arrow keys fire the equipped bow without moving the player', () => {
    const g=game();g.run(arena+'player.inventory.weapons.push(new Bow());player.inventory.index=1;player.ammo=8;');
    g.listeners.keydown({key:'ArrowRight',preventDefault(){}});
    g.run('player.update(1/60);');
    assert.equal(g.run('player.weapon.name'),'Bow');
    assert.equal(g.run('arrows.length'),1);
    assert.equal(g.run('arrows[0].vel.x'),7);
    assert.equal(g.run('arrows[0].vel.y'),0);
    assert.equal(g.run('player.pos.x'),55);
    assert.equal(g.run('player.pos.y'),50);
});

test('two perpendicular arrows fire normalized diagonals in all four quadrants', () => {
    for(const [horizontal,vertical,x,y]of [['ArrowRight','ArrowUp',1,-1],['ArrowRight','ArrowDown',1,1],['ArrowLeft','ArrowUp',-1,-1],['ArrowLeft','ArrowDown',-1,1]]){
        const g=game();g.run(arena+'player.inventory.weapons.push(new Bow());player.inventory.index=1;player.ammo=8;');
        for(const key of [horizontal,vertical])g.listeners.keydown({key,preventDefault(){}});
        g.run('player.update(1/60);');
        assert.equal(g.run('Math.sign(arrows[0].vel.x)'),x);
        assert.equal(g.run('Math.sign(arrows[0].vel.y)'),y);
        assert(Math.abs(g.run('Math.hypot(arrows[0].vel.x,arrows[0].vel.y)')-7)<1e-9);
    }
});

test('opposite aiming keys cancel, and a bow must be collected before shooting', () => {
    const g=game();g.run(arena);
    g.listeners.keydown({key:'ArrowRight',preventDefault(){}});g.run('player.update(0.01)');
    assert.equal(g.run('arrows.length'),0);
    g.run('player.inventory.weapons.push(new Bow());player.inventory.index=1;player.ammo=8;');
    g.listeners.keydown({key:'ArrowLeft',preventDefault(){}});g.run('player.update(0.01)');
    assert.equal(g.run('arrows.length'),0);
});

test('WASD strafing does not change aimed shots and holding respects cooldown', () => {
    const g=game();g.run(arena+'player.inventory.weapons.push(new Bow());player.inventory.index=1;player.ammo=8;');
    for(const key of ['d','ArrowUp'])g.listeners.keydown({key,preventDefault(){}});
    g.run('player.update(0.01);player.update(0.1);');
    assert(g.run('player.pos.x')>55);
    assert.equal(g.run('arrows[0].vel.x'),0);
    assert.equal(g.run('arrows[0].vel.y'),-7);
    assert.equal(g.run('arrows.length'),1);
    g.run('player.update(0.31)');
    assert.equal(g.run('arrows.length'),2);
    g.listeners.keyup({key:'ArrowUp'});g.run('player.update(1)');
    assert.equal(g.run('arrows.length'),2);
});

test('arrows stop at walls before targets even at large frame steps', () => {
    const g=game();g.run(arena+`const hidden=new Enemy(150,50);dungeon.room.tiles=[new Tile(120,40,20,false)];dungeon.room.entities=[hidden];const bolt=new Arrow(80,55,{x:1,y:0});bolt.update(0.25);`);
    assert.equal(g.run('hidden.health'),100);
    assert.equal(g.run('bolt.dead'),true);
    assert(g.run('bolt.pos.x')<150);
});

test('arrows have finite range and draw an oriented arrowhead and glowing trail', () => {
    const g=game();g.run(arena+'const bolt=new Arrow(60,60,{x:1,y:1});bolt.draw();');
    assert(g.calls.some(call=>call[0]==='rotate'&&Math.abs(call[1]-Math.PI/4)<1e-9));
    assert(g.calls.some(call=>call[0]==='moveTo'&&call[1]===10));
    g.run('bolt.update(1);');
    assert.equal(g.run('bolt.remainingRange'),0);
    assert.equal(g.run('bolt.dead'),true);
    assert(Math.abs(g.run('dist({x:60,y:60},bolt.pos)')-300)<1e-8);
});

test('exit opens an optional shop and pauses time, damage and projectiles', () => {
    const g=game();
    g.run(`player.pos={x:935,y:220};player.health=24;keys.attack=true;dungeon.room.doors[0].update();`);
    assert.equal(g.run('shopOpen'),true);
    assert.equal(g.run('dungeon.floor'),1);
    assert.equal(g.run('player.health'),24);
    assert.equal(g.run('keys.attack'),false);
    const time=g.run('runTime');
    g.run(`dungeon.room.update=()=>{throw Error('Shop must pause simulation');};arrows.push({update(){throw Error('Shop must pause projectiles');}});animate(100);`);
    assert.equal(g.run('runTime'),time);
});

test('shop purchases respect prices, cannot overspend, and preserve total gold earned', () => {
    const g=game();g.run('goldCollected=100;openFloorShop();');
    assert.equal(g.run('buyUpgrade("storm")'),false);
    assert.equal(g.run('buyUpgrade("vitality")'),true);
    assert.equal(g.run('buyUpgrade("vitality")'),false);
    assert.equal(g.run('buyUpgrade("damage")'),false);
    assert.equal(g.run('goldCollected-goldSpent'),75);
    assert.equal(g.run('goldCollected'),100);
    assert.equal(g.run('player.maxHealth'),105);
    assert.equal(g.run('player.weapon.damage'),25);
    assert.equal(g.run('buyUpgrade("vitality")'),false);
    assert.equal(g.run('buyUpgrade("__proto__")'),false);
});

test('damage upgrades apply to existing weapons and bows collected later', () => {
    const g=game();g.run(arena+'goldCollected=100;openFloorShop();buyUpgrade("damage");leaveFloor();openFloorShop();buyUpgrade("damage");returnToFloor();const pickup=new Item(player.pos.x,player.pos.y,"bow");pickup.update(0);');
    assert.equal(g.run('player.inventory.weapons[0].damage'),35);
    assert.equal(g.run('player.inventory.weapons[1].damage'),30);
});

test('Storm Spark costs 150, is unique, and chains to only one visible nearby target', () => {
    const g=game();g.run(arena+'goldCollected=300;dungeon.perkOffer="storm";openFloorShop();buyUpgrade("storm");');
    assert.equal(g.run('buyUpgrade("storm")'),false);
    assert.equal(g.run('goldSpent'),150);
    g.run('returnToFloor();const primary=new Enemy(100,50),secondary=new Enemy(150,50),third=new Enemy(200,50);dungeon.room.entities=[primary,secondary,third];strikeEnemy(primary,20);drawEffects(0);');
    assert.equal(g.run('primary.health'),80);
    assert.equal(g.run('secondary.health'),90);
    assert.equal(g.run('third.health'),100);
    assert.equal(g.run('effects.filter(e=>e.type==="lightning").length'),1);
});

test('walls block Storm Spark chaining', () => {
    const g=game();g.run(arena+'player.stormSpark=true;const primary=new Enemy(80,50),secondary=new Enemy(150,50);dungeon.room.entities=[primary,secondary];dungeon.room.tiles=[new Tile(120,50,20,false)];strikeEnemy(primary,20);');
    assert.equal(g.run('secondary.health'),100);
});

test('shop return does not reopen until stepping away from the doorway', () => {
    const g=game();g.run('player.pos={x:935,y:220};const exit=dungeon.room.doors[0];exit.update();returnToFloor();exit.update();');
    assert.equal(g.run('shopOpen'),false);
    g.run('player.pos.x=800;exit.update();player.pos.x=935;exit.update();');
    assert.equal(g.run('shopOpen'),true);
});

test('zero-gold players can descend, purchases survive floors, and descent heals partially', () => {
    const g=game();g.run('openFloorShop();leaveFloor();leaveFloor();');
    assert.equal(g.run('dungeon.floor'),2);
    g.run('goldCollected=25;openFloorShop();buyUpgrade("vitality");player.health=40;leaveFloor();');
    assert.equal(g.run('player.maxHealth'),105);
    assert.equal(g.run('player.health'),70);
    assert.equal(g.elements.get('max-hp-count').textContent,105);
});

test('new runs reset shop upgrades, spending, and modal state', () => {
    const g=game();g.run('goldCollected=225;openFloorShop();buyUpgrade("vitality");buyUpgrade("damage");buyUpgrade("storm");initGame();');
    assert.equal(g.run('player.maxHealth'),100);
    assert.equal(g.run('player.weapon.damage'),25);
    assert.equal(g.run('player.stormSpark'),false);
    assert.equal(g.run('player.damageBonus'),0);
    assert.equal(g.run('goldSpent'),0);
    assert.equal(g.run('shopOpen'),false);
});
test('ammo pickups reward once, bow consumes ammo, and empty bow cannot shoot', () => {
    const g=game();g.run(arena+`const bundle=new Item(55,50,'arrows');bundle.update(0);bundle.update(0);const bowPickup=new Item(55,50,'bow');bowPickup.update(0);player.inventory.index=1;`);
    assert.equal(g.run('player.ammo'),14);
    g.run('player.weapon.attack(player,dungeon.room)');
    assert.equal(g.run('player.ammo'),13);
    assert.equal(g.run('arrows[0].damage'),20);
    g.run('player.ammo=0;player.weapon.attack(player,dungeon.room)');
    assert.equal(g.run('arrows.length'),1);
    g.run('dungeon.nextLevel()');assert.equal(g.run('player.ammo'),0);
    g.run('player.ammo=20;initGame()');assert.equal(g.run('player.ammo'),0);
});

test('equipped sword attacks arrow direction even with a bow collected', () => {
    const g=game();g.run(arena+`player.inventory.weapons.push(new Bow());const above=new Enemy(55,10),below=new Enemy(55,90);dungeon.room.entities=[above,below];keys.down=true;keys.aimUp=true;player.update(0.01);`);
    assert.equal(g.run('above.health'),75);
    assert.equal(g.run('below.health'),100);
    assert.equal(g.run('player.weapon.name'),'Sword');
    assert.equal(g.run('arrows.length'),0);
    assert.equal(g.run('player.swing.angle'),-Math.PI/2);
});

test('normal enemy population grows every two floors with guaranteed elements and ammo plus milestone bosses', () => {
    const g=game();
    for(let floor=1;floor<=21;floor++){
        assert.equal(g.run('dungeon.room.entities.filter(e=>e instanceof Enemy && e.role!=="king").length'),Math.min(12,4+Math.floor((floor-1)/2)));
        assert.equal(g.run('dungeon.room.entities.filter(e=>e instanceof Enemy && e.role==="king").length'),floor%4===0?1:0);
        assert.equal(g.run('new Set(dungeon.room.entities.filter(e=>e instanceof Enemy).map(e=>e.element)).size'),3);
        assert.equal(g.run('dungeon.room.entities.filter(e=>e instanceof Item && e.type==="arrows").length'),2);
        g.run('dungeon.nextLevel()');
    }
});


test('shop purchase and random perk offer persist on reopening and reset next floor', () => {
    const g=game();g.run('goldCollected=500;dungeon.perkOffer="fire";openFloorShop();');
    assert.equal(g.run('buyUpgrade("storm")'),false);
    assert.equal(g.elements.get('offer-storm').hidden,true);
    assert.equal(g.elements.get('offer-fire').hidden,false);
    assert.equal(g.run('buyUpgrade("fire")'),true);
    g.run('returnToFloor();openFloorShop();');
    assert.equal(g.run('dungeon.perkOffer'),'fire');
    assert.equal(g.run('buyUpgrade("damage")'),false);
    assert.equal(g.run('goldSpent'),150);
    g.run('leaveFloor();openFloorShop()');
    assert.equal(g.run('buyUpgrade("damage")'),true);
    g.run('leaveFloor();player.health=99;openFloorShop();leaveFloor()');
    assert.equal(g.run('player.health'),100);
});

test('slime loot awards once, coins count as earned gold, and small health waits when full', () => {
    const g=game();g.run(arena+`Math.random=()=>0;const slime=new Enemy(55,50);slime.destroy();slime.destroy();`);
    assert.equal(g.run('dungeon.room.entities.filter(e=>e instanceof Item).length'),2);
    g.run('const coin=dungeon.room.entities.find(e=>e.type==="coin");coin.update(0);coin.update(0);');
    assert.equal(g.run('goldCollected'),3);
    g.run('const health=dungeon.room.entities.find(e=>e.type==="small-health");health.update(0);');
    assert.equal(g.run('health.dead'),false);
    g.run('player.health=98;health.update(0);health.update(0);');
    assert.equal(g.run('player.health'),100);
    g.run('player.health=20;new Item(55,50,"health").update(0)');
    assert.equal(g.run('player.health'),45);
});

test('all flying slime elements hit once with swept collision and respect invulnerability and walls', () => {
    for (const element of ['goo','fire','water']) {
        const g=game();g.run(arena+`player.pos={x:160,y:50};const shot=new GooShot(50,55,{x:1,y:0},'${element}');shot.update(1);shot.update(1);`);
        assert.equal(g.run('player.health'),94);
        assert.equal(g.run('shot.dead'),true);
        g.run(`new GooShot(160,55,{x:1,y:0},'${element}').update(0)`);
        assert.equal(g.run('player.health'),94);
        g.run(`player.invulnerable=0;dungeon.room.tiles=[new Tile(120,40,20,false)];new GooShot(50,55,{x:1,y:0},'${element}').update(1)`);
        assert.equal(g.run('player.health'),94);
    }
});

test('Fire Ring lasts five seconds, pulses without chaining, respects walls, and resets', () => {
    const g=game();g.run(arena+`player.fireRing=true;const target=new Enemy(90,50),hidden=new Enemy(55,100);dungeon.room.entities=[target,hidden];dungeon.room.tiles=[new Tile(40,85,40,false)];strikeEnemy(target,1);player.update(0.01);`);
    assert.equal(g.run('target.health'),91);
    assert.equal(g.run('hidden.health'),100);
    assert(g.run('player.ringTime')<5);
    g.run('strikeEnemy(target,1)');assert(g.run('player.ringTime')<5);
    g.run('for(let i=0;i<51;i++)player.update(0.1)');
    assert.equal(g.run('player.ringTime'),0);
    const hp=g.run('target.health');g.run('player.update(0.5)');assert.equal(g.run('target.health'),hp);
    g.run('player.ringTime=5;openFloorShop();const before=player.ringTime;animate(100)');assert.equal(g.run('player.ringTime'),5);
    g.run('leaveFloor()');assert.equal(g.run('player.ringTime'),0);
    g.run('initGame()');assert.equal(g.run('player.fireRing'),false);
});

test('Fire Ring hits multiple targets inside its area and marks only affected slimes', () => {
    const g=game();g.run(arena+`player.fireRing=true;player.ringTime=5;player.ringCooldown=20;const nearA=new Enemy(90,50),nearB=new Enemy(55,10),far=new Enemy(200,50);dungeon.room.entities=[nearA,nearB,far];player.update(0.01);`);
    assert.equal(g.run('nearA.health'),92);
    assert.equal(g.run('nearB.health'),92);
    assert.equal(g.run('far.health'),100);
    g.calls.length=0;g.run('nearA.draw();nearB.draw();far.draw()');
    assert.equal(g.calls.filter(call=>call[0]==='strokeRect').length,2);
    g.run('dungeon.room.tiles=[new Tile(80,40,40,false)]');g.calls.length=0;g.run('nearA.draw()');
    assert.equal(g.calls.filter(call=>call[0]==='strokeRect').length,0);
});

test('skill bar shows ownership, active duration, cooldown, ready state, and reset', () => {
    const g=game();
    assert.equal(g.elements.get('skill-status').textContent,'No skill equipped');
    g.run(arena+'player.fireRing=true;const target=new Enemy(90,50);dungeon.room.entities=[target];strikeEnemy(target,1);updateStats()');
    assert.equal(g.run('player.ringCooldown'),20);
    assert.equal(g.elements.get('skill-meter').value,0);
    assert.match(g.elements.get('skill-status').textContent,/active 5.0s/);
    g.run('player.ringTime=0;player.ringCooldown=15;updateStats()');
    assert.equal(g.elements.get('skill-meter').value,5);
    assert.equal(g.elements.get('skill-status').textContent,'Fire Ring · 15s');
    g.run('player.ringCooldown=0;updateStats()');
    assert.equal(g.elements.get('skill-meter').value,20);
    assert.match(g.elements.get('skill-status').textContent,/ready on hit/);
    g.run('initGame()');assert.equal(g.elements.get('skill-meter').value,0);
});

test('slime shots leave matching patches on player impact even when damage is blocked', () => {
    for (const element of ['goo','fire','water']) {
        const g=game();g.run(`dungeon.currentRoom=new Room(9,9,40);const spot=dungeon.room.getSafePos();player.pos={...spot};player.invulnerable=1;const shot=new GooShot(spot.x,spot.y,{x:1,y:0},'${element}');shot.update(0);shot.update(0);`);
        assert.equal(g.run('player.health'),100);
        assert.equal(g.run('shot.dead'),true);
        assert.equal(g.run('dungeon.room.entities.filter(e=>e instanceof GooPuddle).length'),1);
        assert.equal(g.run('dungeon.room.entities.find(e=>e instanceof GooPuddle).element'),element);
        assert.equal(g.run('dungeon.room.entities.find(e=>e instanceof GooPuddle).timer'),6);
    }
});

test('reserved player spawns stay at least 280px from every enemy across floors and seeds', () => {
    const g=game();
    for(let seed=1;seed<=20;seed++) {
        g.run(`var spawnSeed=${seed};Math.random=()=>{spawnSeed=(spawnSeed*1664525+1013904223)>>>0;return spawnSeed/4294967296};initGame();`);
        for(let floor=1;floor<=12;floor++) {
            assert.equal(g.run('dungeon.room.isWalkable(player.pos.x,player.pos.y,player.width,player.height)'),true);
            assert(g.run('Math.min(...dungeon.room.entities.filter(e=>e instanceof Enemy).map(e=>dist(center(player),center(e))))')>=280);
            g.run('dungeon.nextLevel()');
        }
    }
});

test('Skipper commits to its warned landing, can be dodged, and cannot leap through walls', () => {
    const g = game();
    g.run(arena + `
        const skipper = new Enemy(45, 80, "goo", "skipper");
        player.pos = { x: 125, y: 85 };
        skipper.update(0.01);
    `);
    assert.equal(g.run('skipper.leapLanding.x'), 137.5);
    assert.equal(g.run('player.health'), 100);
    g.run('player.pos.y += 60; skipper.update(0.5)');
    assert.equal(g.run('center(skipper).x'), 137.5);
    assert.equal(g.run('player.health'), 100);
    g.run(`
        skipper.pos = { x: 45, y: 80 };
        player.pos = { x: 125, y: 85 };
        dungeon.room.tiles = [new Tile(100, 70, 40, false)];
        const landing = skipper.findLeapLanding(dungeon.room, center(skipper), center(player));
    `);
    assert(g.run('landing.x + skipper.width / 2 <= 100'));
});

test('Prism and the Slime King warn before firing locked volleys, with fire in the boss second phase', () => {
    const g = game();
    g.run(arena + `
        const prism = new Enemy(45, 80, "goo", "prism");
        player.pos = { x: 175, y: 85 };
        prism.shotTimer = 0;
        prism.update(0.01);
    `);
    assert.equal(g.run('arrows.length'), 0);
    assert.equal(g.run('prism.volley.angles[1]'), 0);
    g.run('player.pos.y += 60; prism.update(0.66)');
    assert.equal(g.run('arrows.length'), 3);
    assert.equal(g.run('arrows[1].vel.y'), 0);
    g.run(`
        const king = new Enemy(90, 50, "goo", "king");
        player.pos = { x: 245, y: 70 };
        king.health = king.maxHealth / 2;
        king.shotTimer = 0;
        king.update(0.01);
        king.update(0.66);
    `);
    assert.equal(g.run('arrows.filter(shot => shot.element === "fire").length'), 5);
    g.run(`
        player.pos = { x: 155, y: 70 };
        king.update(0.01);
    `);
    assert.equal(g.run('king.attackTimer'), 0.75);
    assert.equal(g.run('player.health'), 100);
    g.run('king.update(0.75)');
    assert.equal(g.run('player.health'), 79);
});

test('the optional boss is reachable and drops one crown and 25 gold', () => {
    const g = game();
    g.run(`
        dungeon.floor = 3;
        dungeon.nextLevel();
        const king = dungeon.room.entities.find(e => e.role === "king");
        const canReachKing = dungeon.room.findPath(player, center(king)).length > 0;
        player.pos = { x: 935, y: 220 };
        dungeon.room.doors[0].update();
        leaveFloor();
    `);
    assert.equal(g.run('canReachKing'), true);
    assert.equal(g.run('king.dead'), false);
    assert.equal(g.run('dungeon.floor'), 5);
    g.run(`
        dungeon.floor = 3;
        dungeon.nextLevel();
        const returningKing = dungeon.room.entities.find(e => e.role === "king");
        returningKing.onHit(10000);
        returningKing.destroy();
        const crown = dungeon.room.entities.find(e => e.type === "slime-crown");
        const coins = dungeon.room.entities.find(e => e.type === "coin");
        player.health = 48;
        player.pos = { ...crown.pos };
        crown.update(0);
        crown.update(0);
        player.pos = { ...coins.pos };
        coins.update(0);
    `);
    assert.equal(g.run('enemiesSlain'), 1);
    assert.equal(g.run('player.maxHealth'), 110);
    assert.equal(g.run('player.health'), 73);
    assert.equal(g.run('goldCollected'), 25);
    assert.equal(g.run('dungeon.room.entities.filter(e => e.type === "slime-crown").length'), 1);
});

test('Rune Circuit starts scrambled, opens once via E, and upgrades a later bow', () => {
    const g = game();
    g.run('dungeon.nextLevel(); const stones = dungeon.room.entities.filter(e => e instanceof RuneStone)');
    assert.equal(g.run('stones.length'), 4);
    assert(g.run('stones.some(stone => stone.mask !== stone.rightMask)'));
    for (let i = 0; i < 4; i++) {
        g.run(`player.pos = { x: stones[${i}].pos.x + 7.5, y: stones[${i}].pos.y + 10 }`);
        for (let turn = 0; turn < 3 && g.run(`stones[${i}].mask !== stones[${i}].rightMask`); turn++) {
            g.listeners.keydown({ key: 'e', preventDefault() {} });
            g.run('player.update(0)');
        }
    }
    g.run('interactNearby()');
    assert.equal(g.run('dungeon.room.entities.filter(e => e.type === "tempered-shard").length'), 1);
    g.run(`
        const shard = dungeon.room.entities.find(e => e.type === "tempered-shard");
        player.pos = { ...shard.pos };
        shard.update(0);
        openFloorShop();
        leaveFloor();
        new Item(player.pos.x, player.pos.y, "bow").update(0);
    `);
    assert.equal(g.run('player.inventory.weapons[0].damage'), 28);
    assert.equal(g.run('player.inventory.weapons[1].damage'), 23);
    g.run('initGame()');
    assert.equal(g.run('player.weapon.damage'), 25);
});

test('touch interaction reveals the cache once and its charm reduces goo slow for the run', () => {
    const g = game();
    g.run(`
        dungeon.nextLevel();
        dungeon.nextLevel();
        const cache = dungeon.room.entities.find(e => e instanceof HiddenCache);
        const approach = dungeon.room.findPath(player, center(cache));
        player.pos = { x: 45, y: cache.pos.y };
    `);
    assert(g.run('approach.length > 0'));
    assert.equal(g.run('cache.gate.walkable'), false);
    g.elements.get('touch-interact').handlers.click();
    g.run('player.update(0); interactNearby()');
    assert.equal(g.run('cache.gate.walkable'), true);
    assert.equal(g.run('dungeon.room.entities.filter(e => e.type === "mossstep-charm").length'), 1);
    g.run(`
        const charm = dungeon.room.entities.find(e => e.type === "mossstep-charm");
        player.pos = { ...charm.pos };
        charm.update(0);
        new GooPuddle(player.pos.x, player.pos.y, "goo").update(0);
        player.movement(0);
        updateStats();
    `);
    assert.equal(g.elements.get('speed-stat').textContent, '180 px/s');
    g.run('openFloorShop(); leaveFloor()');
    assert.equal(g.run('player.gooSpeedModifier'), 0.75);
    g.run('initGame()');
    assert.equal(g.run('player.gooSpeedModifier'), 0.5);
});

test('Lantern Order resets mistakes, opens one optional reward, and accepts E once per press', () => {
    const g=game();g.run('dungeon.room.puzzle.order=[0,2,1]');
    assert.equal(g.run('dungeon.room.entities.filter(e=>e instanceof Lantern).length'),3);
    for(const i of [0,1,2]) {
        assert(g.run(`dungeon.room.findPath(player,center(dungeon.room.entities.find(e=>e instanceof Lantern&&e.index===${i}))).length`)>0);
    }
    g.run('player.pos={x:125,y:125}');
    g.listeners.keydown({key:'e',preventDefault(){}});g.run('player.update(0)');
    assert.equal(g.run('dungeon.room.puzzle.progress'),0);
    assert.match(g.run('dungeon.room.puzzle.message'),/Wrong/);
    g.run('player.pos={x:45,y:125}');g.listeners.keydown({key:'E',preventDefault(){}});g.listeners.keyup({key:'E'});g.run('player.update(0)');
    assert.equal(g.run('dungeon.room.puzzle.progress'),1);
    g.listeners.keydown({key:'e',repeat:true,preventDefault(){}});g.run('player.update(0)');
    assert.equal(g.run('dungeon.room.puzzle.progress'),1);
    g.run('player.pos={x:205,y:125};interactNearby();player.pos={x:125,y:125};interactNearby();interactNearby()');
    assert.equal(g.run('dungeon.room.puzzle.solved'),true);
    assert.equal(g.run('dungeon.room.entities.filter(e=>e instanceof Item&&e.type==="lantern-heart").length'),1);
    assert.equal(g.run('player.lanternHeart'),false);
    g.run('player.pos={x:208,y:128};dungeon.room.entities.find(e=>e.type==="lantern-heart").update(0)');
    assert.equal(g.run('player.lanternHeart'),true);
    g.run('openFloorShop();leaveFloor()');
    assert.equal(g.run('player.lanternHeart'),true);
    assert.equal(g.run('dungeon.room.puzzle'),undefined);
    g.run('initGame();openFloorShop();leaveFloor()');
    assert.equal(g.run('dungeon.floor'),2); // Puzzle never gates the exit.
    assert.equal(g.run('player.lanternHeart'),false);
});

test('Lantern Heart heals 5 per kill once, caps at max, and cannot revive a dead player', () => {
    const g=game();g.run(arena+'player.lanternHeart=true;player.health=70;const victim=new Enemy(150,150);victim.destroy();victim.destroy()');
    assert.equal(g.run('player.health'),75);
    g.run('player.health=99;new Enemy(150,150).destroy()');assert.equal(g.run('player.health'),100);
    g.run('player.health=0;new Enemy(150,150).destroy()');assert.equal(g.run('player.health'),0);
});

test('lantern order is a shuffled permutation fixed during attempts with no solution text', () => {
    const g=game();const seen=new Set();
    for(let i=0;i<20;i++) {
        g.run('initGame()');
        const order=JSON.parse(g.run('JSON.stringify(dungeon.room.puzzle.order)'));
        assert.deepEqual([...order].sort(),[0,1,2]);seen.add(order.join(','));
        g.run('var wrongIndex=dungeon.room.puzzle.order[0]===0?1:0;player.pos={x:45+wrongIndex*80,y:125};interactNearby();updateStats();');
        assert.deepEqual(JSON.parse(g.run('JSON.stringify(dungeon.room.puzzle.order)')),order);
        assert.equal(g.run('dungeon.room.puzzle.progress'),0);
        assert.equal(g.run('dungeon.room.puzzle.errorUntil-runTime'),0.7);
        assert(!g.elements.get('puzzle-status').textContent.includes('→'));
        assert(!g.run('dungeon.room.puzzle.message').includes('→'));
    }
    assert(seen.size>1);
    g.calls.length=0;g.run('dungeon.room.entities.filter(e=>e instanceof Lantern).forEach(e=>e.draw())');
    assert(!g.calls.some(call=>call[0]==='fillText'&&/I >|I →/.test(call[1])));
    g.run('openFloorShop();animate(lastTime+100)');assert(g.run('dungeon.room.puzzle.errorUntil>runTime'));
    g.run('returnToFloor();runTime+=0.71');assert.equal(g.run('dungeon.room.puzzle.errorUntil>runTime'),false);
});

test('touch pads support independent simultaneous movement and attacks, release, and cancellation', () => {
    const g=game();g.run(arena);
    const event=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,pointerType:'touch',preventDefault(){}});
    const move=g.elements.get('move-pad'),aim=g.elements.get('aim-pad');
    move.handlers.pointerdown(event(1,100,54));aim.handlers.pointerdown(event(2,54,0));
    g.run('player.update(0.01)');assert(g.run('player.pos.x')>55);assert.equal(g.run('player.swing.angle'),-Math.PI/2);
    assert.equal(g.run('touchKeys.right'),true);assert.equal(g.run('touchKeys.aimUp'),true);
    move.handlers.pointerup(event(1,100,54));assert.equal(g.run('touchKeys.right'),false);assert.equal(g.run('touchKeys.aimUp'),true);
    aim.handlers.pointercancel(event(2,54,0));assert.equal(g.run('touchKeys.aimUp'),false);
    assert.equal(move.capture,null);assert.equal(aim.capture,null);
});

test('touch deadzone, pointer ownership, keyboard coexistence, and blur cleanup', () => {
    const g=game();const move=g.elements.get('move-pad');
    const event=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,pointerType:'touch',preventDefault(){}});
    move.handlers.pointerdown(event(1,54,54));assert(!g.run('touchKeys.left||touchKeys.right||touchKeys.up||touchKeys.down'));
    move.handlers.pointermove(event(1,100,100));assert(g.run('touchKeys.right&&touchKeys.down'));
    move.handlers.pointerdown(event(3,0,0));assert(g.run('touchKeys.right&&touchKeys.down'));
    g.listeners.keydown({key:'d',preventDefault(){}});move.handlers.lostpointercapture(event(1,0,0));assert.equal(g.run('inputDown("right")'),true);
    move.handlers.pointerdown(event(4,0,54));g.listeners.blur();assert.equal(g.run('Object.values(touchKeys).some(Boolean)||Object.values(keys).some(Boolean)'),false);assert.equal(move.capture,null);
});

test('touch action buttons switch weapons and interact, while shop and retry clear held pads', () => {
    const g=game();g.run('player.inventory.weapons.push(new Bow());');
    g.elements.get('touch-switch').handlers.click();g.run('player.update(0)');assert.equal(g.run('player.weapon.name'),'Bow');
    g.elements.get('touch-interact').handlers.click();assert.equal(g.run('keys.interact'),true);
    const move=g.elements.get('move-pad');const event={pointerId:1,clientX:100,clientY:54,pointerType:'touch',preventDefault(){}};
    move.handlers.pointerdown(event);g.run('openFloorShop()');assert.equal(g.run('touchKeys.right'),false);
    move.handlers.pointerdown(event);g.elements.get('touch-switch').handlers.click();assert.equal(g.run('keys.switch||touchKeys.right'),false);
    g.run('returnToFloor();initGame()');assert.equal(g.run('Object.values(touchKeys).some(Boolean)'),false);
});

test('clearing a floor puts one chest in reach of the exit, and only a living player can claim it', () => {
    const g = game();
    g.run(`dungeon.room.entities = [new Enemy(400, 200)]; animate(0);`);
    assert.equal(g.run('Boolean(dungeon.room.clearChest)'), false);
    g.run(`dungeon.room.entities[0].dead = true; animate(0); const chest = dungeon.room.clearChest;`);
    assert(g.run('dist(center(chest), { x: 960, y: 220 }) <= 40 && dungeon.room.isWalkable(chest.pos.x, chest.pos.y, chest.width, chest.height)'));
    g.run(`player.pos = { ...chest.pos }; player.health = 0; chest.update();`);
    assert.equal(g.run('goldCollected'), 0);
    g.run(`player.health = 1; animate(0); animate(0);`);
    assert.equal(g.run('goldCollected'), 50);
    assert.equal(g.run('dungeon.room.clearChest === chest && chest.dead'), true);
});

test('the exit offers one clear boon after collecting the chest, independent of a paid upgrade', () => {
    const g = game();
    g.run('openFloorShop()');
    assert.equal(g.elements.get('clear-boons').hidden, true);
    assert.equal(g.run('claimClearBoon("bounty")'), false);
    g.run(`returnToFloor(); dungeon.room.entities = []; animate(0); openFloorShop();`);
    assert.equal(g.elements.get('clear-boons').hidden, true);
    g.run(`returnToFloor(); player.pos = { ...dungeon.room.clearChest.pos }; animate(0); openFloorShop();`);
    assert.equal(g.elements.get('clear-boons').hidden, false);
    g.elements.get('boon-bounty').handlers.click();
    assert.equal(g.run('goldCollected'), 75);
    assert.equal(g.run('buyUpgrade("damage")'), true);
    g.run('returnToFloor(); openFloorShop()');
    assert.equal(g.run('claimClearBoon("quiver")'), false);
    assert.equal(g.run('player.ammo'), 0);
    g.run('leaveFloor(); openFloorShop()');
    assert.equal(g.elements.get('clear-boons').hidden, true);
});

test('a last-slime arrow kill beside the door unlocks the boon before the shop opens', () => {
    const g = game();
    g.run(`player.pos = { x: 935, y: 210 }; const lastSlime = new Enemy(921, 205);
        lastSlime.health = 1; dungeon.room.entities = [lastSlime];
        arrows.push(new Arrow(930, 219, { x: -1, y: 0 })); animate(0);`);
    assert.equal(g.run('lastSlime.dead && shopOpen'), true);
    assert.equal(g.run('goldCollected'), 50);
    assert.equal(g.elements.get('clear-boons').hidden, false);
});

test('clear boons grant distinct run rewards and work even before finding a bow', () => {
    const g = game();
    const clear = `dungeon.room.entities = []; animate(0); player.pos = { ...dungeon.room.clearChest.pos }; animate(0);`;
    g.run(clear);
    assert.equal(g.run('claimClearBoon("edge")'), false);
    g.run('openFloorShop()');
    assert.equal(g.run('claimClearBoon("__proto__")'), false);
    assert.equal(g.run('claimClearBoon("edge")'), true);
    assert.equal(g.run('player.weapon.damage'), 27);
    g.run('leaveFloor();' + clear + 'openFloorShop();');
    assert.equal(g.run('claimClearBoon("quiver")'), true);
    assert.equal(g.run('player.ammo'), 12);
    g.run('initGame()');
    assert.equal(g.run('player.ammo'), 0);
    assert.equal(g.run('player.weapon.damage'), 25);
});

test('a quick Q press switches weapons even when released before the next frame', () => {
    const g = game();
    g.run('player.inventory.weapons.push(new Bow());');
    const q = { key: 'q', preventDefault() {} };
    g.listeners.keydown(q);
    g.listeners.keyup(q);
    g.run('player.update(0); player.update(0);');
    assert.equal(g.run('player.weapon.name'), 'Bow');
});

test('the first floor offers one marked bow beyond the Lantern alcove', () => {
    const g = game();
    g.run(`let lootSeed = 17; Math.random = () => (lootSeed = (lootSeed * 1664525 + 1013904223) >>> 0) / 4294967296;`);
    for (let i = 0; i < 20; i++) {
        g.run('initGame()');
        assert.equal(g.run(`dungeon.room.entities.filter(e => e instanceof Item && e.type === "bow").length`), 1);
        assert.equal(g.run(`dungeon.room.entities.some(e => e.armory && e.pos.x >= 280 && e.pos.x < 480)`), true);
    }
});

test('starting loot has five reachable tiles clear of arrivals, enemies, and the exit chest', () => {
    const g = game();
    assert.equal(g.run(`(() => {
        let seed = 13;
        Math.random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
        const tileKey = ({x, y}) => Math.floor(x / 40) + "," + Math.floor(y / 40);
        for (let run = 0; run < 12; run++) {
            initGame();
            for (let floor = 1; floor <= 8; floor++) {
                const room = dungeon.room;
                const occupied = new Set([tileKey(dungeon.spawn), "23,5", ...room.entities.filter(e => e instanceof Enemy).map(e => tileKey(center(e)))]);
                const loot = room.entities.filter(e => e instanceof Item);
                if (loot.length !== 5 || loot.filter(e => e.type === "arrows").length !== 2) return false;
                for (const item of loot) {
                    const key = tileKey(center(item));
                    if (occupied.has(key) || !room.findPath(player, center(item)).length) return false;
                    occupied.add(key);
                }
                dungeon.nextLevel();
            }
        }
        return true;
    })()`), true);
});
