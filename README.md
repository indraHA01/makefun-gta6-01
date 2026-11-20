[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/indraHA01/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/indraHA01/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

# SOLMAR — an open-world crime story

**SOLMAR** is an original open-world crime game built for the [make.fun](https://make.fun/bounty/gta6-01) **gta6-01** bounty ("Make GTA 6"). It plays offline in desktop Chrome from static files — no build step, no network request, no library.

Mara Voss came home to Solmar Bay for one last job. Explore a sun-soaked coastal city on foot and by car, steal cars with a lock-pick minigame, outrun the Solmar Police Department across 5 wanted stars, run taxi fares and street races, hunt 8 sunsets, and finish a 3-mission story arc to take the Strip back.

## How to play

Serve `game/` with any static server and open `index.html` in desktop Chrome:

```sh
python3 -m http.server 8080 --directory game
# open http://localhost:8080
```

| Key | Action |
| --- | --- |
| WASD / arrows | Walk or drive (Shift to run) |
| E | Enter / steal a car (lock-pick) |
| F | Interact — start missions, taxi, shop |
| Space | Punch / stop the lock-pick needle |
| Mouse click | Shoot |
| T / R | Start a taxi fare / street race (in a car) |
| Q | Save (localStorage) |
| M / H / Esc | Mute / help / pause |

## What is in the game

- **A city to explore** — 11 districts (Marina, Neon Strip, Casino Mile, the Docks, South Beach…), a day cycle with dusk neon, traffic, pedestrians and palms.
- **Cars to steal and drive** — 6 models, arcade handling, a lock-pick timing minigame, and a dealership on Casino Mile.
- **Wanted level** — 0–5 stars; patrol cars cruise in, pursuit cars chase and ram, roadblocks at 3+, heat cools when you stay clean.
- **Missions and story** — 3 story jobs (One Last Job, The Getaway, Turf Payoff) with dialogue, waypoints and payouts.
- **Combat** — punches and pistol shots on foot, drive-by shooting, rival Vipers guarding the M3 cash drops.
- **Activities and progression** — taxi fares, checkpoint street races, 8 sunset collectibles, and a wallet that buys better cars.
- **HUD and minimap** — cash, health, wanted stars, clock, district name, speed, mission objective, and a live minimap with blips.
- **Sound** — fully synthesized WebAudio: engine hum, sirens, a sunny bass-and-pad loop. No audio files.
- **Save** — press Q; continue with C on the title screen.

## Structure

The game's own source is split into files with one clear job each under `game/src/`:

- `config.js` — tuning, districts, car models, missions, palette
- `state.js` — game state, seeded RNG, save/load
- `city.js` — road grid, buildings, palms, beach
- `vehicles.js` — car physics, traffic AI, parked cars
- `pedestrians.js` — walkers, taxi passengers, rival Vipers
- `police.js` — wanted system, pursuit, roadblocks
- `missions.js` — story arc, taxi fares, races, sunsets, dealership
- `combat.js` — punches, bullets, lock-pick minigame
- `audio.js` — synthesized sound and music
- `input.js` — keyboard and mouse
- `render.js` — world drawing, day sky, effects
- `hud.js` — HUD, minimap, menus, dialogue
- `shots.js` — deterministic screenshot staging
- `main.js` — the game loop that wires it all together

`main.ts` at the repo root hands the game in with the kit's `vendor/makefun-game.ts`.

## Originality

Everything is original: the city of Solmar Bay, its characters (Mara Voss, Rosa Delgado, Marco Vane), vehicles, story, art and music are made for this entry. Nothing from Rockstar Games' GTA series or any other commercial game is used — no names, logos, characters, map, art, music or assets.

## License

MIT — see [LICENSE](LICENSE).
