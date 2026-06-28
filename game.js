/* =========================================================
   KIDS JIGSAW PUZZLE - CORE ENGINE (game.js)
   ========================================================= */

// === Sound Controller (Web Audio API Synthesizer) ===
class SoundController {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playSnap() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Delightful high-pitched double-ding
        const playTone = (freq, start, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.12, start);
            gain.gain.linearRampToValueAtTime(0.001, start + duration);
            
            osc.start(start);
            osc.stop(start + duration);
        };

        playTone(523.25, now, 0.08); // C5
        playTone(659.25, now + 0.06, 0.15); // E5
    }

    playVictory() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Ascending major chord fanfare
        const playTone = (freq, start, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.1, start);
            gain.gain.linearRampToValueAtTime(0.001, start + duration);
            
            osc.start(start);
            osc.stop(start + duration);
        };

        playTone(261.63, now, 0.1);         // C4
        playTone(329.63, now + 0.08, 0.1);    // E4
        playTone(392.00, now + 0.16, 0.1);    // G4
        playTone(523.25, now + 0.24, 0.35);   // C5
    }
}

const sounds = new SoundController();

// === Game Engine State ===
const state = {
    imageSrc: 'dino.png',
    piecesTargetCount: 24,
    gridRows: 4,
    gridCols: 6,
    pieces: [],
    isCompleted: false,
    guideMode: true,
    rotationEnabled: true,
    activePiece: null,
    dragStartPointer: { x: 0, y: 0 },
    dragStartOffset: { x: 0, y: 0 },
    draggedDistance: 0,
    snapDistance: 30, // in pixels
    timerInterval: null,
    timerSeconds: 0,
};

// === DOM elements ===
const puzzleBoard = document.getElementById('puzzle-board');
const boardGhost = document.getElementById('board-ghost');
const boardGridOverlay = document.getElementById('board-grid-overlay');
const piecesLayer = document.getElementById('pieces-layer');
const workspace = document.getElementById('workspace');
const piecesSlider = document.getElementById('pieces-slider');
const piecesCountDisplay = document.getElementById('pieces-count-display');
const btnStart = document.getElementById('btn-start');
const toggleGuide = document.getElementById('toggle-guide');
const toggleRotation = document.getElementById('toggle-rotation');
const thumbnailPreview = document.getElementById('thumbnail-preview');
const previewImage = document.getElementById('preview-image');
const closePreview = document.getElementById('close-preview');
const victoryModal = document.getElementById('victory-modal');
const btnPlayAgain = document.getElementById('btn-play-again');
const timerDisplay = document.getElementById('timer-display');
const victoryTimeDisplay = document.getElementById('victory-time');
const bestTimesList = document.getElementById('best-times-list');
const victoryBestTimesList = document.getElementById('victory-best-times-list');

// === Initialize Engine ===
function init() {
    // 1. Hook Control Events
    piecesSlider.addEventListener('input', (e) => {
        state.piecesTargetCount = parseInt(e.target.value);
        piecesCountDisplay.textContent = state.piecesTargetCount;
    });
    piecesSlider.addEventListener('change', () => {
        startGame();
    });

    btnStart.addEventListener('click', () => {
        sounds.init();
        startGame();
    });

    toggleGuide.addEventListener('click', () => {
        state.guideMode = !state.guideMode;
        toggleGuide.classList.toggle('active', state.guideMode);
        boardGhost.classList.toggle('hidden', !state.guideMode);
    });

    toggleRotation.addEventListener('click', () => {
        state.rotationEnabled = !state.rotationEnabled;
        toggleRotation.classList.toggle('active', state.rotationEnabled);
    });

    // Image Buttons selection
    document.querySelectorAll('.img-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.img-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const imgPath = e.target.getAttribute('data-img');
            state.imageSrc = imgPath;
            previewImage.src = imgPath;
            
            loadImage(imgPath);
        });
    });

    // Custom File Loader
    document.getElementById('image-loader').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                state.imageSrc = event.target.result;
                previewImage.src = event.target.result;
                loadImage(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    // Close preview button
    closePreview.addEventListener('click', () => {
        thumbnailPreview.classList.remove('show');
    });

    btnPlayAgain.addEventListener('click', () => {
        victoryModal.classList.add('hidden');
        startGame();
    });

    // Global drag event listeners
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);

    // Prevent double-tap zoom on iOS Safari inside the game workspace
    let lastTouchEnd = 0;
    workspace.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });

    // Initial Load
    renderBestTimes();
    loadImage(state.imageSrc);
}

// === Load Image & Adapt Aspect Ratio ===
function loadImage(src) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
        // Adjust Board aspect ratio dynamically
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        puzzleBoard.style.aspectRatio = aspectRatio.toString();
        boardGhost.style.backgroundImage = `url(${src})`;
        
        // Show Preview floating card
        thumbnailPreview.classList.add('show');
        
        startGame();
    };
}

// === Grid Dimension Calculations ===
function calculateGrid(targetCount, aspectRatio) {
    let bestR = 2, bestC = 2, minScore = Infinity;
    
    // Scan potential row/col configs
    for (let r = 2; r <= Math.sqrt(targetCount) * 2; r++) {
        let c = Math.round(targetCount / r);
        if (c < 2) continue;
        
        const currentRatio = c / r;
        const ratioDiff = Math.abs(currentRatio - aspectRatio);
        const countDiff = Math.abs(r * c - targetCount);
        
        // Weight aspects: alignment of ratio is more important than exact target count
        const score = ratioDiff * 15 + countDiff;
        if (score < minScore) {
            minScore = score;
            bestR = r;
            bestC = c;
        }
    }
    
    return { rows: bestR, cols: bestC };
}

// === Start New Puzzle Game ===
function startGame() {
    state.isCompleted = false;
    startTimer();
    state.pieces = [];
    piecesLayer.innerHTML = '';
    boardGridOverlay.innerHTML = '';
    
    const boardWidth = puzzleBoard.clientWidth;
    const boardHeight = puzzleBoard.clientHeight;
    const aspectRatio = boardWidth / boardHeight;
    
    // Calculate row/col count
    const grid = calculateGrid(state.piecesTargetCount, aspectRatio);
    state.gridRows = grid.rows;
    state.gridCols = grid.cols;
    
    // Set grid columns/rows style in DOM
    boardGridOverlay.style.gridTemplateRows = `repeat(${state.gridRows}, 1fr)`;
    boardGridOverlay.style.gridTemplateColumns = `repeat(${state.gridCols}, 1fr)`;
    
    // Create Grid lines overlay
    const totalCells = state.gridRows * state.gridCols;
    for (let i = 0; i < totalCells; i++) {
        const line = document.createElement('div');
        line.classList.add('grid-line');
        boardGridOverlay.appendChild(line);
    }
    
    // Piece dimensions
    const pieceWidth = boardWidth / state.gridCols;
    const pieceHeight = boardHeight / state.gridRows;
    
    // Get board positioning relative to workspace
    const boardRect = puzzleBoard.getBoundingClientRect();
    const workspaceRect = workspace.getBoundingClientRect();
    const relativeBoardLeft = boardRect.left - workspaceRect.left;
    const relativeBoardTop = boardRect.top - workspaceRect.top;
    
    // Create pieces
    for (let r = 0; r < state.gridRows; r++) {
        for (let c = 0; c < state.gridCols; c++) {
            const index = r * state.gridCols + c;
            
            // Correct relative board coordinates
            const correctX = c * pieceWidth + relativeBoardLeft;
            const correctY = r * pieceHeight + relativeBoardTop;
            
            // Background positions
            const bgX = c * pieceWidth;
            const bgY = r * pieceHeight;
            
            // Setup DOM element
            const pieceElement = document.createElement('div');
            pieceElement.classList.add('puzzle-piece');
            pieceElement.style.width = `${pieceWidth}px`;
            pieceElement.style.height = `${pieceHeight}px`;
            pieceElement.style.backgroundImage = `url(${state.imageSrc})`;
            pieceElement.style.backgroundPosition = `-${bgX}px -${bgY}px`;
            pieceElement.style.backgroundSize = `${boardWidth}px ${boardHeight}px`;
            
            // Random orientation (Phase 3)
            let rotation = 0;
            if (state.rotationEnabled) {
                const rotationAngles = [0, 90, 180, 270];
                rotation = rotationAngles[Math.floor(Math.random() * rotationAngles.length)];
            }
            
            // Scatter position coordinates (Phase 2)
            // Scatter only on the right half of the workspace to avoid covering the board
            const scatterLeftBound = workspaceRect.width * 0.52;
            const scatterRightBound = workspaceRect.width - pieceWidth - 24;
            const scatterTopBound = 24;
            const scatterBottomBound = workspaceRect.height - pieceHeight - 24;
            
            const currentX = scatterLeftBound + Math.random() * (scatterRightBound - scatterLeftBound);
            const currentY = scatterTopBound + Math.random() * (scatterBottomBound - scatterTopBound);
            
            // Store state entry
            const pieceState = {
                id: index,
                element: pieceElement,
                correctX,
                correctY,
                currentX,
                currentY,
                rotation,
                isLocked: false
            };
            
            // Apply initial position transforms
            pieceElement.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(${rotation}deg)`;
            
            // Listeners for dragging
            pieceElement.addEventListener('pointerdown', (e) => onPointerDown(e, pieceState));
            
            state.pieces.push(pieceState);
            piecesLayer.appendChild(pieceElement);
        }
    }
}

// === Pointer Down Events ===
function onPointerDown(e, piece) {
    if (piece.isLocked) return;
    
    sounds.init();
    
    state.activePiece = piece;
    piece.element.classList.add('dragging');
    
    // Store cursor start position
    state.dragStartPointer = { x: e.clientX, y: e.clientY };
    state.dragStartOffset = { x: piece.currentX, y: piece.currentY };
    state.draggedDistance = 0;
    
    e.preventDefault();
}

// === Pointer Move Events ===
function onPointerMove(e) {
    if (!state.activePiece) return;
    
    const deltaX = e.clientX - state.dragStartPointer.x;
    const deltaY = e.clientY - state.dragStartPointer.y;
    
    state.draggedDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Update coordinates
    const newX = state.dragStartOffset.x + deltaX;
    const newY = state.dragStartOffset.y + deltaY;
    
    // Bound dragging within the workspace
    const workspaceRect = workspace.getBoundingClientRect();
    const pieceRect = state.activePiece.element.getBoundingClientRect();
    
    // Clamped coordinates relative to workspace
    const clampedX = Math.max(0, Math.min(newX, workspaceRect.width - pieceRect.width));
    const clampedY = Math.max(0, Math.min(newY, workspaceRect.height - pieceRect.height));
    
    state.activePiece.currentX = clampedX;
    state.activePiece.currentY = clampedY;
    
    // Apply position transform (preserving rotation during active drag)
    state.activePiece.element.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0) rotate(${state.activePiece.rotation}deg)`;
}

// === Pointer Up Events ===
function onPointerUp(e) {
    if (!state.activePiece) return;
    
    const piece = state.activePiece;
    piece.element.classList.remove('dragging');
    state.activePiece = null;
    
    // Phase 3: Click/Tap rotation handler
    // If the user clicked/tapped (moved less than 6px), rotate the piece
    if (state.draggedDistance < 6) {
        rotatePiece(piece);
    } else {
        // Phase 4: Snapping & Locking checks
        checkSnapping(piece);
    }
}

// === Rotate Piece (Phase 3 placeholder / logic integration) ===
function rotatePiece(piece) {
    if (!state.rotationEnabled) return;
    
    piece.rotation = (piece.rotation + 90) % 360;
    piece.element.style.transform = `translate3d(${piece.currentX}px, ${piece.currentY}px, 0) rotate(${piece.rotation}deg)`;
    
    // Check snapping immediately after rotation click/tap
    checkSnapping(piece);
}

// === Snap & Lock verification (Phase 4 placeholder / logic integration) ===
function checkSnapping(piece) {
    // Dynamic recalculation of correct coordinates (in case workspace resized)
    const boardRect = puzzleBoard.getBoundingClientRect();
    const workspaceRect = workspace.getBoundingClientRect();
    const relativeBoardLeft = boardRect.left - workspaceRect.left;
    const relativeBoardTop = boardRect.top - workspaceRect.top;
    
    const pieceWidth = boardRect.width / state.gridCols;
    const pieceHeight = boardRect.height / state.gridRows;
    
    // Calculate current row/column index in grid
    const c = piece.id % state.gridCols;
    const r = Math.floor(piece.id / state.gridCols);
    
    const correctX = c * pieceWidth + relativeBoardLeft;
    const correctY = r * pieceHeight + relativeBoardTop;
    
    // Calculate offset distance
    const dist = Math.sqrt(Math.pow(piece.currentX - correctX, 2) + Math.pow(piece.currentY - correctY, 2));
    
    // Snaps if within threshold AND correct orientation (0 degrees)
    if (dist < state.snapDistance && piece.rotation % 360 === 0) {
        snapPieceIntoPlace(piece, correctX, correctY);
    }
}

function snapPieceIntoPlace(piece, x, y) {
    piece.isLocked = true;
    piece.currentX = x;
    piece.currentY = y;
    
    // Disable active transitions during snapping
    piece.element.style.transition = 'all 0.15s ease-out';
    piece.element.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(0deg)`;
    piece.element.classList.add('locked');
    
    // Play sound and particle sparkles
    sounds.playSnap();
    triggerSparkles(piece);
    
    // Reset transition
    setTimeout(() => {
        if (piece.element) {
            piece.element.style.transition = '';
        }
    }, 150);
    
    // Check victory condition
    checkVictory();
}

// === Sparkle Visual Effect on Snapping ===
function triggerSparkles(piece) {
    const pieceRect = piece.element.getBoundingClientRect();
    const workspaceRect = workspace.getBoundingClientRect();
    
    const centerX = pieceRect.left - workspaceRect.left + pieceRect.width / 2;
    const centerY = pieceRect.top - workspaceRect.top + pieceRect.height / 2;
    
    // Spawn 8 sparkle burst particles
    for (let i = 0; i < 8; i++) {
        const sparkle = document.createElement('div');
        sparkle.classList.add('sparkle');
        
        // Position at center
        sparkle.style.left = `${centerX - 15}px`;
        sparkle.style.top = `${centerY - 15}px`;
        
        // Add random scatter offset using translate
        const angle = (i * Math.PI / 4);
        const dist = 30 + Math.random() * 40;
        const scatterX = Math.cos(angle) * dist;
        const scatterY = Math.sin(angle) * dist;
        
        sparkle.style.transform = `translate(${scatterX}px, ${scatterY}px)`;
        
        workspace.appendChild(sparkle);
        
        // Cleanup after animation
        setTimeout(() => sparkle.remove(), 500);
    }
}

// === Check Victory State ===
function checkVictory() {
    const allLocked = state.pieces.every(p => p.isLocked);
    if (allLocked && !state.isCompleted) {
        state.isCompleted = true;
        
        stopTimer();
        saveScore();
        
        // Celebrate!
        sounds.playVictory();
        
        victoryTimeDisplay.textContent = formatTime(state.timerSeconds);
        renderVictoryBestTimes();
        
        setTimeout(() => {
            victoryModal.classList.remove('hidden');
        }, 600);
    }
}

// === Timer & Best Times Logic ===
function startTimer() {
    stopTimer();
    state.timerSeconds = 0;
    timerDisplay.textContent = '00:00';
    
    state.timerInterval = setInterval(() => {
        state.timerSeconds++;
        timerDisplay.textContent = formatTime(state.timerSeconds);
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getImageFriendlyName(src) {
    if (src.startsWith('data:image')) {
        return 'Custom Photo';
    }
    const filename = src.split('/').pop().split('.')[0];
    if (filename === 'dino') return '🦕 Dino';
    if (filename === 'space') return '🚀 Space';
    if (filename === 'ocean') return '🐳 Ocean';
    if (filename === 'unicorns') return '🦄 Magic';
    if (filename === 'candy') return '🍬 Candy';
    if (filename === 'fairy') return '🍄 Fairy';
    if (filename === 'zot') return '🐜 Zot';
    if (filename === 'dragons') return '🐲 Dragons';
    if (filename === 'tree') return '🌈 Tree';
    if (filename === 'baby_dinos') return '🦖 Baby Dinos';
    return filename.charAt(0).toUpperCase() + filename.slice(1);
}

function saveScore() {
    const name = getImageFriendlyName(state.imageSrc);
    const count = state.gridRows * state.gridCols;
    
    const newScore = {
        name: name,
        pieces: count,
        seconds: state.timerSeconds,
        date: new Date().toLocaleDateString()
    };
    
    let scores = [];
    try {
        const stored = localStorage.getItem('puzzle_best_times');
        if (stored) {
            scores = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading best times:', e);
    }
    
    scores.push(newScore);
    scores.sort((a, b) => a.seconds - b.seconds);
    scores = scores.slice(0, 10);
    
    try {
        localStorage.setItem('puzzle_best_times', JSON.stringify(scores));
    } catch (e) {
        console.error('Error saving best times:', e);
    }
    
    renderBestTimes();
}

function renderBestTimes() {
    let scores = [];
    try {
        const stored = localStorage.getItem('puzzle_best_times');
        if (stored) {
            scores = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error parsing scores:', e);
    }
    
    bestTimesList.innerHTML = '';
    if (scores.length === 0) {
        bestTimesList.innerHTML = '<div class="no-scores">No scores yet!</div>';
        return;
    }
    
    scores.forEach(score => {
        const scoreItem = document.createElement('div');
        scoreItem.classList.add('score-item');
        scoreItem.innerHTML = `
            <span class="score-image">${score.name}</span>
            <span class="score-details">${score.pieces} pcs</span>
            <span class="score-time">${formatTime(score.seconds)}</span>
        `;
        bestTimesList.appendChild(scoreItem);
    });
}

function renderVictoryBestTimes() {
    let scores = [];
    try {
        const stored = localStorage.getItem('puzzle_best_times');
        if (stored) {
            scores = JSON.parse(stored);
        }
    } catch (e) {
        console.error(e);
    }
    
    victoryBestTimesList.innerHTML = '';
    const topScores = scores.slice(0, 5);
    
    topScores.forEach((score, index) => {
        const scoreItem = document.createElement('div');
        scoreItem.classList.add('score-item');
        
        // Highlight current run
        const isCurrentRun = (score.seconds === state.timerSeconds && 
                              score.pieces === (state.gridRows * state.gridCols) && 
                              score.name === getImageFriendlyName(state.imageSrc));
        if (isCurrentRun) {
            scoreItem.style.background = 'rgba(139, 92, 246, 0.15)';
            scoreItem.style.borderColor = 'rgba(139, 92, 246, 0.4)';
        }
        
        scoreItem.innerHTML = `
            <span class="score-image">#${index + 1} ${score.name}</span>
            <span class="score-details">${score.pieces} pcs</span>
            <span class="score-time">${formatTime(score.seconds)}</span>
        `;
        victoryBestTimesList.appendChild(scoreItem);
    });
}

// === Window resizing adaptation ===
window.addEventListener('resize', () => {
    if (!state.pieces || state.pieces.length === 0) return;
    
    // Recalculate board placements for snapped/locked pieces
    const boardRect = puzzleBoard.getBoundingClientRect();
    const workspaceRect = workspace.getBoundingClientRect();
    const relativeBoardLeft = boardRect.left - workspaceRect.left;
    const relativeBoardTop = boardRect.top - workspaceRect.top;
    
    const pieceWidth = boardRect.width / state.gridCols;
    const pieceHeight = boardRect.height / state.gridRows;
    
    state.pieces.forEach(piece => {
        // Redefine width/height
        piece.element.style.width = `${pieceWidth}px`;
        piece.element.style.height = `${pieceHeight}px`;
        piece.element.style.backgroundSize = `${boardRect.width}px ${boardRect.height}px`;
        
        const c = piece.id % state.gridCols;
        const r = Math.floor(piece.id / state.gridCols);
        
        piece.element.style.backgroundPosition = `-${c * pieceWidth}px -${r * pieceHeight}px`;
        
        const correctX = c * pieceWidth + relativeBoardLeft;
        const correctY = r * pieceHeight + relativeBoardTop;
        
        piece.correctX = correctX;
        piece.correctY = correctY;
        
        if (piece.isLocked) {
            piece.currentX = correctX;
            piece.currentY = correctY;
            piece.element.style.transform = `translate3d(${correctX}px, ${correctY}px, 0) rotate(0deg)`;
        }
    });
});

// Run
document.addEventListener('DOMContentLoaded', init);
