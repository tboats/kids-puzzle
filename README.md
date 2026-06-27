# Antigravity Kids Jigsaw Puzzle 🧩

A beautiful, premium cross-platform jigsaw puzzle game designed for kids aged 4–9. Runs smoothly in modern browsers on both desktops (macOS/Windows) and touch devices (iPad/tablets).

## Features
- **Dynamic Slicing:** Choose any grid scale from 20 to 200 pieces using a simple control slider.
- **Rotation Mechanics:** Pieces scramble with random orientations ($0^\circ, 90^\circ, 180^\circ, 270^\circ$). Tapping or clicking a piece rotates it by $+90^\circ$.
- **Unified Touch/Mouse Dragging:** Full support for touch dragging on iPads and mouse dragging on desktops using the Pointer Events API.
- **Visual & Audio Snapping:** When a piece is dragged close to its correct location and is oriented correctly, it snaps into place, plays a particle sparkle effect, and synthesizes a rewarding audio chime.
- **No External Files:** Core audio chimes are synthesized directly in the browser via the Web Audio API, making it lightweight and self-contained.
- **Predefined Child-Friendly Library:** Includes 6 high-quality custom illustrations (Dino, Space, Ocean, Magic, Candy, and Fairy) alongside custom photo uploading.
- **Responsive Layout:** Board scales dynamically based on image aspect ratio and takes up ~50% of the screen, with the right half serving as the scatter zone.

## How to Play
1. Open the game in your web browser.
2. Select a target picture from the sidebar or click **Custom Photo** to load your own.
3. Configure the number of pieces with the slider.
4. Click **Start Puzzle**.
5. Drag pieces onto the board:
   - **Click/Tap** a piece to rotate it.
   - **Drag** a piece to move it.
6. Match both the position and orientation of each piece. It will snap and lock when correctly solved!
7. Complete all pieces to see the victory screen!

## Running Locally
To launch the game, simply open `index.html` in your browser.

Alternatively, spin up a local development server:
```bash
# Python 3
python -m http.server 8000

# Node.js (npx)
npx serve .
```
Navigate to `http://localhost:8000` (or the port specified) in your browser.
