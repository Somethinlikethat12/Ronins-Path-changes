# Copilot instructions

## Project structure and architecture

Ronin's Path is a browser game with no build step: `index.html` loads classic JavaScript files in dependency order, and their top-level declarations share the global scope. Keep that order correct when adding or moving scripts; later files rely on classes and constants defined earlier.

The single-player runtime is centered on `Game` in `js/game.js`. It owns the update/render loop and coordinates `Player`, `Enemy`, `World`, effects, input, and the equipment menu. `js/world.js` creates the seeded procedural world; `js/player.js` and `js/enemy.js` hold combat behavior; `js/draw.js` and `js/effects.js` provide canvas rendering and effects. The startup and online lobby screens are DOM in `index.html`, wired by `js/menu.js`; in-game HUDs and overlays are mostly drawn on the canvas.

Online play has two paths. `js/net.js` wraps PeerJS connections and message dispatch. `js/coop.js` uses the host as authority for shared world/enemy state. `js/duel.js` runs a deterministic, delayed-input simulation with periodic state correction. `js/settings.js` validates host-selected match rules. A change to synchronized state should be checked against the corresponding serialized/synchronized field lists and protocol version, not just the local gameplay code.

## Data and code conventions

- Save data is a compact snapshot, not a serialized world: `js/save.js` rebuilds the world from its seed, then applies progress. Validate and clamp persisted or received data before applying it. Bump `SAVE_VERSION` when changing the save format incompatibly.
- Equipment/loadout preferences and match settings use separate `localStorage` keys and have their own sanitization paths (`js/loadout.js`, `js/settings.js`); keep those concerns separate from journey progress.
- Procedural generation and duel synchronization depend on deterministic random/state evolution. Preserve seeded RNG use and deterministic update order in code that affects the world or multiplayer combat.
- JavaScript uses `'use strict'`, semicolons, and browser-native globals rather than imports/exports or a package-managed module system. Shared helpers such as clamping, geometry, and seeded randomness live in `js/util.js`.

## Build, test, and lint

There is no package manifest, build step, or lint command in this repository. The game is run directly from `index.html` in a browser; save persistence is implemented with browser `localStorage`. Run the automated checks from the repository root with `node tests/enemies.test.js` and `node tests/weapons.test.js`; each loads the JavaScript files it covers into a `node:vm` context and prints a checks-passed line. Syntax-check a file with `node --check js/<file>.js`. Test fixtures are partial `Game` stand-ins, so guard new `Game` hooks called from `Enemy` or `Player` code (for example, `typeof g.startClash === 'function'`).
