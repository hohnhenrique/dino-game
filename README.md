# Runner — Terminal Endless Runner

An endless runner game built with **vanilla JavaScript** — no frameworks, no dependencies. A pixel soldier runs through a terminal landscape dodging firewalls, glitches, drones and satellites. Same visual identity as the [Memory Game](https://github.com/) and [Snake](https://github.com/) projects.

🎮 [Play online](#) — *replace with your GitHub Pages link after deploy*

---

## Gameplay

Guide your runner through an endless terminal environment. Obstacles approach from the right — jump over ground threats, duck under aerial ones. The game speeds up every 500 points, raising the difficulty level and introducing new obstacle types.

### Controls

| Action | Keyboard | Mobile |
|---|---|---|
| Jump | `Space` · `↑` · `W` | Tap canvas / ▲ button / swipe up |
| Double jump | `Space` again mid-air | Tap again mid-air |
| Duck | `↓` · `S` (hold) | Hold ▼ button / swipe down |

### Obstacles

| Name | Type | Appears at |
|---|---|---|
| Firewall | Ground — wide and short | Level 1 |
| Glitch | Ground — narrow and tall | Level 1 |
| Packet | Ground — double wide | Level 2 |
| Drone | Aerial — duck to avoid | Level 2 |
| Satellite | Aerial — high up | Level 3 |

---

## Features

- Endless runner with procedural obstacle spawning
- 3 obstacle types on ground + 2 aerial (duck to avoid)
- Double jump mechanic
- Progressive difficulty: speed and obstacle variety increase with level
- Running animation, dust particles and star twinkle effects
- Shared top 10 leaderboard powered by JSONBin.io
- Player name required before playing — saved in `localStorage`
- Swipe controls on mobile (swipe up = jump, swipe down = duck)
- Fully responsive canvas (adapts to screen width)

---

## Tech stack

- HTML5 Canvas API
- CSS3 (custom properties, responsive layout)
- JavaScript ES6+ (no libraries)
- [JSONBin.io](https://jsonbin.io) for shared cloud ranking

---

## Running locally

No build step required. Open `index.html` in your browser, or spin up a local server:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then visit `http://localhost:8000`.

---

## Project structure

```
runner/
├── index.html   # page structure
├── style.css    # styles and visual theme
├── script.js    # game logic + ranking integration
└── README.md
```

---

## How scoring works

- Every frame the runner is alive adds to a raw score counter
- The displayed score is `rawScore ÷ 5` — approximately 1 point per second at base speed
- Higher levels mean the runner moves faster, so points accumulate quicker
- The leaderboard ranks by final score (descending)

---

## Possible future improvements

- Sound effects (beeps and blips on jump / collision)
- Power-ups (shield, slow-motion)
- Animated background parallax layers
- Ghost replay of the top score run

---

## License

Free to use and modify.
# dino-game
