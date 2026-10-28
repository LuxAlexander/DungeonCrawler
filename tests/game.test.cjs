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
    g.run(`player.pos = {x: 935, y: 220}; player.health = 30; arrows.push(new Arrow(100,100,{x:1,y:0})); dungeon.room.doors[0].update(); leaveFloor();`);
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

test('arrow keys select the collected bow and fire without moving the player', () => {
    const g=game();g.run(arena+'player.inventory.weapons.push(new Bow());');
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
        const g=game();g.run(arena+'player.inventory.weapons.push(new Bow());');
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
    g.run('player.inventory.weapons.push(new Bow());');
    g.listeners.keydown({key:'ArrowLeft',preventDefault(){}});g.run('player.update(0.01)');
    assert.equal(g.run('arrows.length'),0);
});

test('WASD strafing does not change aimed shots and holding respects cooldown', () => {
    const g=game();g.run(arena+'player.inventory.weapons.push(new Bow());');
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
    assert.equal(g.run('buyUpgrade("vitality")'),true);
    assert.equal(g.run('buyUpgrade("damage")'),true);
    assert.equal(g.run('goldCollected-goldSpent'),0);
    assert.equal(g.run('goldCollected'),100);
    assert.equal(g.run('player.maxHealth'),120);
    assert.equal(g.run('player.weapon.damage'),30);
    assert.equal(g.run('buyUpgrade("vitality")'),false);
    assert.equal(g.run('buyUpgrade("__proto__")'),false);
});

test('damage upgrades apply to existing weapons and bows collected later', () => {
    const g=game();g.run(arena+'goldCollected=100;openFloorShop();buyUpgrade("damage");buyUpgrade("damage");returnToFloor();const pickup=new Item(55,50,"bow");pickup.update(0);');
    assert.equal(g.run('player.inventory.weapons[0].damage'),35);
    assert.equal(g.run('player.inventory.weapons[1].damage'),30);
});

test('Storm Spark costs 150, is unique, and chains to only one visible nearby target', () => {
    const g=game();g.run(arena+'goldCollected=300;openFloorShop();buyUpgrade("storm");');
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

test('zero-gold players can descend, purchases survive floors, and vitality refills', () => {
    const g=game();g.run('openFloorShop();leaveFloor();leaveFloor();');
    assert.equal(g.run('dungeon.floor'),2);
    g.run('goldCollected=25;openFloorShop();buyUpgrade("vitality");player.health=40;leaveFloor();');
    assert.equal(g.run('player.maxHealth'),110);
    assert.equal(g.run('player.health'),110);
    assert.equal(g.elements.get('max-hp-count').textContent,110);
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
