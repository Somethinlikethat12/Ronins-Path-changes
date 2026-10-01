'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const context = vm.createContext({ console });
for (const name of ['util', 'effects', 'world', 'skills', 'loadout', 'player', 'settings', 'save', 'game', 'coop', 'duel', 'net']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', name + '.js'), 'utf8'), context);
}
const { lo, g, p, shrine, fxEvents } = vm.runInContext(`(() => {
    const lo = new Loadout(), shrine = { x: 0, y: 0, discovered: true };
    const fxEvents = [];
    const fx = new Proxy({}, { get: (_, name) => (...args) => fxEvents.push({ name, args }) });
    const g = { loadout: lo, skills: new Set(), world: { shrines: [shrine], camps: [],
        resolve() {}, solidAt: () => false }, enemies: [], totalElites: 5, lastShrine: shrine,
        rnd: { nextDouble: () => 1 }, fx, sfx: { play() {} }, time: 0,
        deathblowTarget: () => null, enemyInFront: () => false, projectileHitCheck: () => 240,
        playerHitCheck() {}, shake() {}, hitstop() {}, zoomKick() {} };
    return { lo, g, p: new Player(g, 0, 0), shrine, fxEvents };
})()`, context);

assert.equal(p.throws, 5);
assert.equal(vm.runInContext('PLAYER_DAMAGE_SCALE', context), 0.94);
assert.equal(vm.runInContext('computeStats', context)(lo, 100, 3, new Set()).dmg, 0.94);
assert.equal(p.comboAtk[0].damage, vm.runInContext('P_COMBO[0].damage', context) * 0.94);
assert.equal(p.throwAtk.damage, lo.throwableDef().damage * 0.94);
for (const [id, arc, finisherArc] of [['spear', 42, 54], ['hammer', 150, 185], ['axe', 180, 240]]) {
    lo.sword = id;
    p.applyLoadout();
    assert.equal(p.comboAtk[0].arc, arc * Math.PI / 180);
    assert.equal(p.comboAtk[2].arc, finisherArc * Math.PI / 180);
}
for (const id of ['storm-spear', 'serpent-spear', 'war-hammer', 'stone-hammer']) {
    lo.sword = id;
    p.applyLoadout();
    assert.equal(p.sword.id, id);
    assert.equal(p.comboAtk.length, 3);
}
const weaponMenu = new (vm.runInContext('EquipMenu', context))(g);
weaponMenu.tab = 1;
weaponMenu.selectWeaponType(2);
assert(weaponMenu.tabIndices().every(i => vm.runInContext('weaponType(SWORDS[' + i + '])', context) === 'spear'));
assert(weaponMenu.tabIndices().some(i => vm.runInContext('SWORDS[' + i + '].id', context) === 'storm-spear'));
weaponMenu.selectWeaponType(3);
assert(weaponMenu.tabIndices().every(i => vm.runInContext('weaponType(SWORDS[' + i + '])', context) === 'hammer'));
assert(weaponMenu.tabIndices().some(i => vm.runInContext('SWORDS[' + i + '].id', context) === 'stone-hammer'));
for (const id of ['hammer', 'war-hammer', 'stone-hammer', 'axe']) {
    lo.sword = id;
    p.applyLoadout();
    assert.equal(p.stabAtk.name, 'heavy-smash');
    assert.equal(p.stabAtk.perilous, true);
    assert.equal(p.stabAtk.thrust, false);
}
lo.sword = 'spear';
p.applyLoadout();
assert.equal(p.stabAtk.perilous, true);
p.st = 'ATTACK';
p.phase = 0;
p.combo = 0;
p.cur = p.comboAtk[0];
p.stT = p.cur.windup;
p.facing = 0;
p.aimX = 100;
p.aimY = 0;
p.bufParry = 0;
p.bufDodge = 0;
fxEvents.length = 0;
p.attack(0, 0);
assert(fxEvents.some(e => e.name === 'thrust'));
assert(!fxEvents.some(e => e.name === 'slash'));
const effects = new (vm.runInContext('Effects', context))();
effects.thrust(0, 0, 0, 100, 0.2, 14, vm.runInContext('rgb(180, 220, 255)', context));
effects.update(0.1);
assert.equal(effects.thrusts.length, 1);
effects.update(0.11);
assert.equal(effects.thrusts.length, 0);
p.toFree();

// poise: heavy weapons keep swinging through light hits, light weapons and perilous attacks still interrupt
g.flash = () => {};
const P_HIT_RESULT = vm.runInContext('P_HIT', context);
const hitDuringSwing = (id, combo, dmg, perilous) => {
    lo.sword = id;
    p.applyLoadout();
    p.hp = p.maxHp;
    p.invuln = 0;
    p.x = 0;
    p.y = 0;
    p.startAttack(combo);
    assert.equal(p.receive(50, 0, dmg, 10, perilous), P_HIT_RESULT);
    const st = p.st;
    p.toFree();
    return st;
};
assert.equal(hitDuringSwing('wanderer', 0, 14, false), 'STAGGER');
assert.equal(hitDuringSwing('spear', 0, 14, false), 'STAGGER');
assert.equal(hitDuringSwing('hammer', 0, 14, false), 'ATTACK');
assert.equal(hitDuringSwing('hammer', 0, 14, true), 'STAGGER');
assert.equal(hitDuringSwing('hammer', 0, 30, false), 'STAGGER');
assert.equal(hitDuringSwing('stone-hammer', 2, 30, false), 'ATTACK');
lo.sword = 'hammer';
p.applyLoadout();
p.startAttack(0);
p.invuln = 0;
p.receive(50, 0, 14, 10, false);
assert.equal(p.st, 'ATTACK');
p.invuln = 0;
p.receive(50, 0, 14, 10, false);
assert.equal(p.st, 'STAGGER');
p.toFree();
const statsFor = id => { lo.sword = id; return vm.runInContext('computeStats', context)(lo, 100, 3, new Set()).poise; };
assert(statsFor('stone-hammer') > statsFor('war-hammer') && statsFor('war-hammer') > statsFor('hammer'));
assert(statsFor('hammer') > statsFor('axe') && statsFor('axe') > statsFor('odachi') && statsFor('odachi') > statsFor('wanderer'));
lo.sword = 'wanderer';
p.applyLoadout();

// weapon-tuned armor: bonuses only apply with the matching weapon type
const stats = () => vm.runInContext('computeStats', context)(lo, 100, 3, new Set());
lo.armor = 'ashigaru';
lo.sword = 'spear';
const spearStats = stats();
lo.armor = 'traveler';
const plainSpear = stats();
assert.equal(spearStats.reach, plainSpear.reach + 10);
assert(spearStats.spd < plainSpear.spd);
assert(spearStats.move > plainSpear.move);
lo.armor = 'ashigaru';
lo.sword = 'wanderer';
assert.equal(stats().reach, 0);
lo.armor = 'oyoroi';
lo.sword = 'hammer';
const hammerStats = stats();
assert.equal(hammerStats.poise, 26 + 14);
assert(hammerStats.post > 1.65);
assert(hammerStats.def < 0.78 && hammerStats.maxPosture === 135);
lo.sword = 'spear';
assert.equal(stats().poise, 0);
const CoopForArmor = vm.runInContext('Coop', context);
lo.armor = 'traveler';
lo.sword = 'wanderer';
p.applyLoadout();
CoopForArmor.syncGear(p, { sword: 'stone-hammer', armor: 'oyoroi' });
assert.equal(lo.armor, 'oyoroi');
assert.equal(p.poise, 38 + 14);
CoopForArmor.syncGear(p, { armor: 'not-real' });
assert.equal(lo.armor, 'oyoroi');
lo.armor = 'traveler';
lo.sword = 'wanderer';
p.applyLoadout();

const arts = vm.runInContext('ARTS', context);
const spearArt = arts.find(a => a.id === 'spearfall');
const hammerArt = arts.find(a => a.id === 'earthshaker');
const matchesWeapon = vm.runInContext('artMatchesWeapon', context);
assert.equal(spearArt.weapon, 'spear');
assert.equal(hammerArt.weapon, 'hammer');
assert.equal(spearArt.motion, 'thrust');
assert.equal(hammerArt.motion, 'slam');
assert(matchesWeapon(spearArt, vm.runInContext('findItem(SWORDS, "spear")', context)));
assert(matchesWeapon(spearArt, vm.runInContext('findItem(SWORDS, "storm-spear")', context)));
assert(matchesWeapon(spearArt, vm.runInContext('findItem(SWORDS, "serpent-spear")', context)));
assert(!matchesWeapon(spearArt, vm.runInContext('findItem(SWORDS, "hammer")', context)));
assert(matchesWeapon(hammerArt, vm.runInContext('findItem(SWORDS, "war-hammer")', context)));
assert(matchesWeapon(hammerArt, vm.runInContext('findItem(SWORDS, "stone-hammer")', context)));
assert(matchesWeapon(arts.find(a => a.id === 'whirlwind'), vm.runInContext('findItem(SWORDS, "hammer")', context)));

lo.sword = 'spear';
lo.art = hammerArt.id;
p.applyLoadout();
p.artCharges = 3;
p.tryArt(0);
assert.equal(p.st, 'FREE');
assert.equal(p.artCharges, 3);
lo.art = spearArt.id;
p.applyLoadout();
p.artCharges = 3;
p.tryArt(0);
assert.equal(p.st, 'ART');
fxEvents.length = 0;
p.stT = spearArt.hits[0].t;
p.artUpdate(0, 0);
assert(fxEvents.some(e => e.name === 'thrust'));
p.toFree();

lo.sword = 'hammer';
lo.art = hammerArt.id;
p.applyLoadout();
p.artCharges = 3;
p.tryArt(0);
assert.equal(p.st, 'ART');
fxEvents.length = 0;
p.stT = hammerArt.hits[0].t;
p.artUpdate(0, 0);
assert(fxEvents.some(e => e.name === 'slash'));
assert(fxEvents.some(e => e.name === 'ring'));
p.toFree();

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
Coop.syncGear(remote, { sword: 'storm-spear', art: 'spearfall' });
assert.equal(remote.sword.id, 'storm-spear');
assert.equal(remote.art.id, 'spearfall');
Coop.syncGear(remote, { sword: 'hammer', art: 'spearfall' });
assert.equal(remote.sword.id, 'hammer');
assert.equal(remote.art.id, 'whirlwind');
Coop.syncGear(remote, { sword: 'invalid', throwable: 'invalid' });
assert.equal(remote.sword.id, 'hammer');
assert.equal(Coop.playerData(remote).art, 'whirlwind');

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
assert(vm.runInContext('PLAYER_SYNC', context).includes('poiseLeft'));
assert(vm.runInContext('COOP_PLAYER_FIELDS', context).includes('poiseLeft'));
assert.equal(vm.runInContext('NET_VERSION', context), 8);
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
