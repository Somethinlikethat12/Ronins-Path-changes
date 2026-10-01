'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const context = vm.createContext({ console });
for (const name of ['util', 'world', 'skills', 'loadout', 'player', 'settings', 'save', 'game', 'coop', 'duel', 'net']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', name + '.js'), 'utf8'), context);
}
const { lo, g, p, shrine } = vm.runInContext(`(() => {
    const lo = new Loadout(), shrine = { x: 0, y: 0, discovered: true };
    const fx = new Proxy({}, { get: () => () => {} });
    const g = { loadout: lo, skills: new Set(), world: { shrines: [shrine], camps: [],
        resolve() {}, solidAt: () => false }, enemies: [], totalElites: 5, lastShrine: shrine,
        rnd: { nextDouble: () => 1 }, fx, sfx: { play() {} }, time: 0,
        deathblowTarget: () => null, enemyInFront: () => false, projectileHitCheck: () => 240 };
    return { lo, g, p: new Player(g, 0, 0), shrine };
})()`, context);

assert.equal(p.throws, 5);
for (const [id, arc] of [['spear', 42], ['hammer', 110], ['axe', 180]]) {
    lo.sword = id;
    p.applyLoadout();
    assert.equal(p.comboAtk[0].arc, arc * Math.PI / 180);
}
assert.equal(p.stabAtk.perilous, false);
lo.sword = 'spear';
p.applyLoadout();
assert.equal(p.stabAtk.perilous, true);

lo.throwable = 'throwingaxe';
p.applyLoadout();
assert.equal(p.maxThrows, 3);
assert.equal(p.throws, 3);
p.aimX = 240;
p.aimY = 0;
p.bufThrow = 0.2;
for (let i = 0; i < 25; i++) p.update(1 / 60);
assert.equal(p.throws, 2);
assert.equal(p.st, 'FREE');
assert.equal(p.throwDone, false);

const target = vm.runInContext('projectileTarget', context);
const near = { x: 120, y: 0, r: 15, st: 'FREE' };
const far = { x: 180, y: 0, r: 15, st: 'FREE' };
assert.equal(target(p, p.throwAtk, [far, near], g.world).target, near);
g.world.solidAt = x => x >= 60 && x <= 70;
assert.equal(target(p, p.throwAtk, [near], g.world).target, null);
g.world.solidAt = () => false;
let struck = 0;
near.takeHit = () => { struck++; };
g.enemies = [near, far];
const Game = vm.runInContext('Game', context);
Game.prototype.projectileHitCheck.call(g, p, p.throwAtk);
assert.equal(struck, 1);
g.world.solidAt = x => x >= 60 && x <= 70;
Game.prototype.projectileHitCheck.call(g, p, p.throwAtk);
assert.equal(struck, 1);
g.world.solidAt = () => false;
g.enemies = [];

const Coop = vm.runInContext('Coop', context);
const remote = new (vm.runInContext('Player', context))(g, 0, 0);
remote.g = Object.assign(Object.create(g), { loadout: lo.clone() });
Coop.syncGear(remote, { sword: 'axe', throwable: 'kunai' });
assert.equal(remote.sword.id, 'axe');
assert.equal(remote.throwable.id, 'kunai');
Coop.syncGear(remote, { sword: 'invalid', throwable: 'invalid' });
assert.equal(remote.sword.id, 'axe');

const SaveGame = vm.runInContext('SaveGame', context);
Object.assign(g, { seed: 123, kills: 0, elitesSlain: 0, ngPlus: 0, bossSpawned: false,
    bossDefeated: false, exp: 0, pointsEarned: 0, player: p });
const save = SaveGame.serialize(g);
assert.equal(save.player.throws, 2);
p.throws = 0;
SaveGame.apply(g, save);
assert.equal(p.throws, 2);
save.player.throws = 999;
SaveGame.apply(g, save);
assert.equal(p.throws, 3);
delete save.player.throws;
p.throws = 0;
SaveGame.apply(g, save);
assert.equal(p.throws, 3);

assert.equal(vm.runInContext('sanitizeInput', context)([0, 0, 0, 0, 2048])[4], 2048);
assert(vm.runInContext('PLAYER_SYNC', context).includes('throws'));
assert.equal(vm.runInContext('NET_VERSION', context), 3);
const Duel = vm.runInContext('Duel', context);
const duel = { n: 1, players: [p] };
p.st = 'THROW';
p.throwDone = true;
p.throws = 1;
const packed = Duel.prototype.packPlayer.call(duel, p);
p.throwDone = false;
p.throws = 0;
Duel.prototype.unpackPlayer.call(duel, p, packed);
assert.equal(p.throwDone, true);
assert.equal(p.throws, 1);
p.toFree();
p.throws = 0;
g.nearShrine = () => shrine;
g.findRestBlockers = () => [];
g.banner = () => {};
g.saveNow = () => {};
Game.prototype.interact.call(g);
assert.equal(p.throws, 3);
p.throws = 0;
p.respawn(shrine.x, shrine.y);
assert.equal(p.throws, 3);
console.log('Weapon and throwable checks passed');
