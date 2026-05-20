import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";
import { 
  WIDTH, HEIGHT, STATE_START, STATE_GAME_OVER, 
  BLADE_SMOOTHING_FACTOR, TRACKING_LOSS_TOLERANCE_MS, PINCH_THRESHOLD,
  DEBUG_MODE
} from './src/config.js';
import { Blade } from './src/blade.js';
import { GameManager } from './src/game.js';

const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

const overlayContainer = document.getElementById('overlay-container');
const actionBtn = document.getElementById('action-button');

// Rotating start tips
const helperTips = [
  "Sit far away & use open hands",
  "Best in good lighting",
  "Keep one hand in frame",
  "Pinch fingers to pause",
  "Slice fast for combos",
  "Stay near center for better tracking"
];
let tipIndex = 0;
const helperEl = document.getElementById('helper-text-container');

if (helperEl) {
  setInterval(() => {
    helperEl.classList.add('fade-out');
    setTimeout(() => {
      tipIndex = (tipIndex + 1) % helperTips.length;
      helperEl.innerText = helperTips[tipIndex];
      helperEl.classList.remove('fade-out');
    }, 300); // Wait for fade-out animation to complete
  }, 2800);
}

const ui = {
  updateScore: (s) => {
    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.innerText = s;
  },
  updateLives: (l) => {
    const heartsEl = document.getElementById('hearts-display');
    if (heartsEl) {
      const maxLives = 3;
      const heartsFilled = Math.max(0, Math.min(maxLives, l));
      const heartsEmpty = Math.max(0, maxLives - heartsFilled);
      heartsEl.innerText = '❤'.repeat(heartsFilled) + '♡'.repeat(heartsEmpty);
    }
  },
  showOverlay: (title, subtitle, btnText) => {
    overlayContainer.classList.remove('hidden');
    
    // Hide all view screens first
    document.querySelectorAll('.screen-view').forEach(el => el.classList.add('hidden'));
    
    const hud = document.getElementById('hud');
    
    if (title.includes("LOADING") || title.includes("INITIALIZING")) {
      const view = document.getElementById('overlay-loading');
      if (view) {
        view.classList.remove('hidden');
        if (subtitle) {
          view.querySelector('.loading-subtitle').innerText = subtitle;
        }
      }
      if (hud) hud.classList.add('hidden');
    } else if (title.includes("PAUSED")) {
      const view = document.getElementById('overlay-paused');
      if (view) view.classList.remove('hidden');
      if (hud) hud.classList.remove('hidden');
    } else if (title.includes("NO HAND") || title.includes("LOST")) {
      const view = document.getElementById('overlay-no-hand');
      if (view) view.classList.remove('hidden');
      if (hud) hud.classList.remove('hidden');
    } else if (title.includes("GAME OVER")) {
      const view = document.getElementById('overlay-game-over');
      if (view) {
        view.classList.remove('hidden');
        const finalScoreEl = document.getElementById('final-score');
        if (finalScoreEl) finalScoreEl.innerText = gameManager.score;
      }
      if (hud) hud.classList.remove('hidden');
    } else {
      // Start/Menu screen
      const view = document.getElementById('overlay-start');
      if (view) {
        view.classList.remove('hidden');
        if (btnText) {
          actionBtn.style.display = 'inline-block';
          actionBtn.innerText = btnText;
        } else {
          actionBtn.style.display = 'none';
        }
        if (subtitle) {
          view.querySelector('.game-subtitle').innerText = subtitle;
        }
      }
      if (hud) hud.classList.add('hidden');
    }
  },
  hideOverlay: () => {
    overlayContainer.classList.add('hidden');
    const hud = document.getElementById('hud');
    if (hud) hud.classList.remove('hidden');
  }
};

const blade = new Blade();
const gameManager = new GameManager(ui);

let handDetected = false;
let fingertipPos = null;
let thumbPos = null;
let isPinching = false;
let lastHandTime = performance.now();
let currentHandLandmarks = null; // Store landmarks for debug skeleton rendering

let handLandmarker = undefined;

// Load ML model first
ui.showOverlay("LOADING ML MODEL", "Downloading HandLandmarker WebAssembly...", null);

async function initializeHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.7,
    minHandPresenceConfidence: 0.4,
    minTrackingConfidence: 0.4
  });
  
  ui.showOverlay("FRUIT NINJA AR", "Touch some fruits", "START CAMERA");
}

initializeHandLandmarker();

let cameraStream = null;

actionBtn.addEventListener('click', async () => {
  try {
    if (!cameraStream) {
      cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: WIDTH, height: HEIGHT } 
      });
      videoElement.srcObject = cameraStream;
      await new Promise(resolve => {
        videoElement.onloadedmetadata = () => {
          videoElement.play();
          resolve();
        };
      });
    }
    gameManager.state = STATE_START;
    ui.showOverlay("FRUIT NINJA AR", "PINCH TO START", null);
  } catch (err) {
    console.error("Camera access failed", err);
    ui.showOverlay("CAMERA ERROR", "Could not access webcam.", "RETRY");
  }
});

function renderLoop() {
  canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
  
  currentHandLandmarks = null; // Reset every frame
  
  canvasCtx.save();
  canvasCtx.translate(WIDTH, 0);
  canvasCtx.scale(-1, 1);
  
  if (videoElement.readyState >= 2 && handLandmarker) {
    // Draw mirrored video stream
    canvasCtx.drawImage(videoElement, 0, 0, WIDTH, HEIGHT);
    
    // Draw subtle dark webcam overlay tint (15% opacity) directly on canvas feed
    canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    
    // Process synchronously for ultra-low latency hand tracking
    const startTimeMs = performance.now();
    const results = handLandmarker.detectForVideo(videoElement, startTimeMs);
    
    if (results.landmarks && results.landmarks.length > 0) {
      lastHandTime = performance.now();
      handDetected = true;
      currentHandLandmarks = results.landmarks[0];
      
      const lmIndex = currentHandLandmarks[8]; 
      const lmThumb = currentHandLandmarks[4]; 
      
      const targetX = (1 - lmIndex.x) * WIDTH;
      const targetY = lmIndex.y * HEIGHT;
      
      if (fingertipPos) {
        fingertipPos.x = fingertipPos.x + BLADE_SMOOTHING_FACTOR * (targetX - fingertipPos.x);
        fingertipPos.y = fingertipPos.y + BLADE_SMOOTHING_FACTOR * (targetY - fingertipPos.y);
      } else {
        fingertipPos = { x: targetX, y: targetY };
      }
      
      thumbPos = {
        x: (1 - lmThumb.x) * WIDTH,
        y: lmThumb.y * HEIGHT
      };
      
      const dist = Math.hypot(fingertipPos.x - thumbPos.x, fingertipPos.y - thumbPos.y);
      isPinching = dist < PINCH_THRESHOLD; 
    } else {
      if (performance.now() - lastHandTime > TRACKING_LOSS_TOLERANCE_MS) {
        handDetected = false;
        fingertipPos = null;
        thumbPos = null;
        isPinching = false;
      }
    }
  }
  
  canvasCtx.restore(); 
  
  // Render glow green skeletal hand wireframe if DEBUG_MODE is active
  if (DEBUG_MODE && handDetected && currentHandLandmarks) {
    canvasCtx.strokeStyle = 'rgba(0, 255, 204, 0.6)';
    canvasCtx.fillStyle = '#00ffcc';
    canvasCtx.lineWidth = 3;
    
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [5, 9], [9, 10], [10, 11], [11, 12], // Middle
      [9, 13], [13, 14], [14, 15], [15, 16], // Ring
      [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [0, 17] // Palm connector
    ];
    
    // Draw connection lines
    for (const [i1, i2] of connections) {
      const pt1 = currentHandLandmarks[i1];
      const pt2 = currentHandLandmarks[i2];
      canvasCtx.beginPath();
      canvasCtx.moveTo((1 - pt1.x) * WIDTH, pt1.y * HEIGHT);
      canvasCtx.lineTo((1 - pt2.x) * WIDTH, pt2.y * HEIGHT);
      canvasCtx.stroke();
    }
    
    // Draw glowing nodes at each joint
    for (let i = 0; i < 21; i++) {
      const pt = currentHandLandmarks[i];
      canvasCtx.beginPath();
      canvasCtx.arc((1 - pt.x) * WIDTH, pt.y * HEIGHT, 5, 0, Math.PI * 2);
      canvasCtx.fill();
    }
  }
  
  blade.update(fingertipPos);
  gameManager.update(blade.getLastSegment(), handDetected, isPinching, fingertipPos, thumbPos);
  
  gameManager.draw(canvasCtx);
  blade.draw(canvasCtx);
  
  requestAnimationFrame(renderLoop);
}

renderLoop();
