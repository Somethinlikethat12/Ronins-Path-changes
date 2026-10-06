'use strict';

/** Skill tree data and EXP curve. Each skill's apply() modifies the stats object from computeStats(). */
const SKILL_BRANCHES = [
    { name: 'Way of the Assassin', kanji: '暗', color: rgb(140, 200, 255) },
    { name: 'Way of the Juggernaut', kanji: '剛', color: rgb(255, 210, 110) },
    { name: 'Way of the Mystic', kanji: '霊', color: rgb(235, 110, 90) },
];

const SKILLS = [
    // Branch 0: Assassin
    { id: 'swift', branch: 0, tier: 0, cost: 1, name: 'Swift Step', kanji: '迅', desc: 'Move with the unseen wind.', info: 'Move speed +10%',
        apply: s => { s.move *= 1.10; } },
    { id: 'phantom', branch: 0, tier: 1, cost: 1, name: 'Phantom', kanji: '幻', desc: 'Slip through blades and sight alike.',
        info: 'Dodge invincibility +0.08s  -  Quieter footsteps', apply: s => { s.iframes += 0.08; s.stealth *= 0.5; } },
    { id: 'viper', branch: 0, tier: 2, cost: 2, name: "Viper's Kiss", kanji: '蛇', desc: 'Fast, lethal strikes from the shadows.',
        info: 'Swings 10% faster  -  Damage +10%', apply: s => { s.spd *= 0.9; s.dmg *= 1.1; } },
    { id: 'mortalblow', branch: 0, tier: 3, cost: 3, name: 'Bloodlust', kanji: '血', desc: 'Take strength from every life you end.',
        info: 'Deathblows restore 25% vitality', apply: s => { s.deathblowHeal += 0.25; } },
    { id: 'ironwill', branch: 0, tier: 4, cost: 4, name: 'Iron Will', kanji: '心', desc: 'Refuse the edge of death.',
        info: 'Survive one lethal hit at 1 HP per rest', apply: s => { s.lastStand = true; } },
    { id: 'nightstalker', branch: 0, tier: 5, cost: 5, name: 'Nightstalker', kanji: '闇', desc: 'Enemies cannot see you until you are upon them.',
        info: 'Detection range significantly reduced', apply: s => { s.stealth *= 0.3; } },
    { id: 'flicker', branch: 0, tier: 6, cost: 5, name: 'Flicker', kanji: '閃', desc: 'Vanish completely when evading.',
        info: 'Dodge invincibility +0.12s', apply: s => { s.iframes += 0.12; } },
    { id: 'crimson', branch: 0, tier: 7, cost: 6, name: 'Crimson Dance', kanji: '舞', desc: 'Your blade moves faster than the eye can track.',
        info: 'Swings 20% faster  -  Move speed +10%', apply: s => { s.spd *= 0.8; s.move *= 1.1; } },
    { id: 'heartseeker', branch: 0, tier: 8, cost: 6, name: 'Heartseeker', kanji: '穿', desc: 'Every cut finds a vital artery.',
        info: 'Damage +25%  -  Posture damage +10%', apply: s => { s.dmg *= 1.25; s.post *= 1.1; } },
    { id: 'reaper', branch: 0, tier: 9, cost: 7, name: "Reaper's Feast", kanji: '骸', desc: 'A deathblow restores your physical form entirely.',
        info: 'Deathblows fully restore vitality', apply: s => { s.deathblowHeal += 0.75; } },

    // Branch 1: Juggernaut
    { id: 'vitality', branch: 1, tier: 0, cost: 1, name: 'Vitality', kanji: '命', desc: 'A hardier body for brutal combat.',
        info: 'Vitality +40', apply: s => { s.maxHp += 40; } },
    { id: 'mountain', branch: 1, tier: 1, cost: 1, name: 'Mountain Stance', kanji: '山', desc: 'Root yourself like ancient stone.',
        info: 'Posture +40', apply: s => { s.maxPosture += 40; } },
    { id: 'unbroken', branch: 1, tier: 2, cost: 2, name: 'Unbroken', kanji: '不', desc: 'A perfect deflect settles your breathing.',
        info: 'Deflect restores 15 posture', apply: s => { s.deflectRecover += 15; } },
    { id: 'colossus', branch: 1, tier: 3, cost: 3, name: 'Colossus', kanji: '巨', desc: 'Shrug off blows that would fell lesser warriors.',
        info: 'Poise +25  -  Damage taken -15%', apply: s => { s.poise += 25; s.def *= 0.85; } },
    { id: 'crush', branch: 1, tier: 4, cost: 4, name: 'Crushing Blows', kanji: '砕', desc: 'Every strike rattles the enemy\'s stance.',
        info: 'Posture damage +35%', apply: s => { s.post *= 1.35; } },
    { id: 'avalanche', branch: 1, tier: 5, cost: 5, name: 'Avalanche', kanji: '崩', desc: 'Your strikes shatter the earth and their resolve.',
        info: 'Posture damage +40%', apply: s => { s.post *= 1.4; } },
    { id: 'adamantine', branch: 1, tier: 6, cost: 5, name: 'Adamantine Flesh', kanji: '鋼', desc: 'Blades glance off your hardened skin.',
        info: 'Damage taken -25%', apply: s => { s.def *= 0.75; } },
    { id: 'warlord', branch: 1, tier: 7, cost: 6, name: "Warlord's Stride", kanji: '将', desc: 'Walk through their attacks unbroken.',
        info: 'Poise +40  -  Posture +60', apply: s => { s.poise += 40; s.maxPosture += 60; } },
    { id: 'hulking', branch: 1, tier: 8, cost: 6, name: 'Hulking Frame', kanji: '巌', desc: 'Your vitality is legendary.',
        info: 'Vitality +100', apply: s => { s.maxHp += 100; } },
    { id: 'godofwar', branch: 1, tier: 9, cost: 7, name: 'God of War', kanji: '戦', desc: 'Become an unstoppable force of devastation.',
        info: 'Damage +50%  -  Posture damage +30%', apply: s => { s.dmg *= 1.5; s.post *= 1.3; } },

    // Branch 2: Mystic / Spear
    { id: 'echo', branch: 2, tier: 0, cost: 1, name: 'Spirit Echo', kanji: '霊', desc: 'Battle awakens more power in your combat arts.',
        info: '+1 art charge  -  Combat Arts +25% damage', apply: s => { s.charges += 1; s.artDmg *= 1.25; } },
    { id: 'reach', branch: 2, tier: 1, cost: 1, name: 'Extended Reach', kanji: '伸', desc: 'Project your ki through your weapon.',
        info: 'Weapon reach +12', apply: s => { s.reach += 12; } },
    { id: 'breath', branch: 2, tier: 2, cost: 2, name: 'Breath of Life', kanji: '息', desc: 'Carry one more draught of healing.',
        info: '+1 Healing Gourd', apply: s => { s.gourds += 1; } },
    { id: 'resonance', branch: 2, tier: 3, cost: 3, name: 'Resonant Deflect', kanji: '響', desc: 'Your deflects ring through the enemy\'s bones.',
        info: 'Deflects deal +40% posture damage  -  Deflect window +30ms', apply: s => { s.deflectPost *= 1.4; s.deflect += 0.03; } },
    { id: 'dragonflash', branch: 2, tier: 4, cost: 4, name: 'Dragon Flash', kanji: '龍', desc: 'At full Ki, release a cutting wave with G.',
        info: 'New ability: Dragon Flash', apply: s => { s.dragonFlash = true; } },
    { id: 'voidstrike', branch: 2, tier: 5, cost: 5, name: 'Void Strike', kanji: '空', desc: 'Your ki extends far beyond your physical blade.',
        info: 'Weapon reach +18', apply: s => { s.reach += 18; } },
    { id: 'chakra', branch: 2, tier: 6, cost: 5, name: 'Chakra Channel', kanji: '脈', desc: 'Abundant spiritual energy fuels your journey.',
        info: '+2 art charges  -  +1 Healing Gourd', apply: s => { s.charges += 2; s.gourds += 1; } },
    { id: 'mindseye', branch: 2, tier: 7, cost: 6, name: "Mind's Eye", kanji: '眼', desc: 'Deflect strikes before they even materialize.',
        info: 'Deflect window +50ms', apply: s => { s.deflect += 0.05; } },
    { id: 'karmic', branch: 2, tier: 8, cost: 6, name: 'Karmic Mirror', kanji: '鏡', desc: 'Turn their own malice against their posture.',
        info: 'Deflects deal +80% posture damage', apply: s => { s.deflectPost *= 1.8; } },
    { id: 'ascendant', branch: 2, tier: 9, cost: 7, name: 'Ascendant Art', kanji: '昇', desc: 'Your Combat Arts unleash catastrophic spiritual power.',
        info: 'Combat Arts +80% damage', apply: s => { s.artDmg *= 1.8; } },
];

function skillAt(branch, tier) { return SKILLS.find(s => s.branch === branch && s.tier === tier); }

function skillPrereq(sk) { return sk.tier === 0 ? null : skillAt(sk.branch, sk.tier - 1); }

const SKILL_TIERS = 10;

/** EXP needed to earn the next skill point. */
function expForNextPoint(pointsEarned) { return 120 + 45 * pointsEarned; }

function expForKill(e) {
    if (e.boss) return 2500;
    if (e.elite) return 500;
    const base = e.type === 'BRUTE' ? 70 : 35;
    return Math.round(base * (e.vet ? 1.5 : 1));
}
