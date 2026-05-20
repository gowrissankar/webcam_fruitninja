import { 
  WIDTH, HEIGHT, STATE_START, STATE_GAME_OVER, 
  BLADE_SMOOTHING_FACTOR, TRACKING_LOSS_TOLERANCE_MS, PINCH_THRESHOLD
} from './src/config.js';
import { Blade } from './src/blade.js';
import { GameManager } from './src/game.js';

const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySubtitle = document.getElementById('overlay-subtitle');
const actionBtn = document.getElementById('action-button');

const ui = {
  updateScore: (s) => { scoreEl.innerText = s; },
  updateLives: (l) => { livesEl.innerText = l; },
  showOverlay: (title, subtitle, btnText) => {
    overlayEl.classList.remove('hidden');
    overlayTitle.innerText = title;
    overlaySubtitle.innerText = subtitle;
    if (btnText) {
      actionBtn.style.display = 'block';
      actionBtn.innerText = btnText;
    } else {
      actionBtn.style.display = 'none';
    }
  },
  hideOverlay: () => {
    overlayEl.classList.add('hidden');
  }
};

const blade = new Blade();
const gameManager = new GameManager(ui);

let handDetected = false;
let fingertipPos = null;
let thumbPos = null;
let isPinching = false;

let lastHandTime = performance.now();

const hands = new window.Hands({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.6
});

hands.onResults((results) => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    lastHandTime = performance.now();
    handDetected = true;
    
    const lmIndex = results.multiHandLandmarks[0][8]; 
    const lmThumb = results.multiHandLandmarks[0][4]; 
    
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
});

let cameraStream = null;

ui.showOverlay("FRUIT NINJA AR", "Click start to allow camera access", "START CAMERA");

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

let lastVideoTime = -1;
let isProcessing = false;

function renderLoop() {
  canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
  
  canvasCtx.save();
  canvasCtx.translate(WIDTH, 0);
  canvasCtx.scale(-1, 1);
  if (videoElement.readyState >= 2) {
    canvasCtx.drawImage(videoElement, 0, 0, WIDTH, HEIGHT);
    
    if (videoElement.currentTime !== lastVideoTime && !isProcessing) {
      lastVideoTime = videoElement.currentTime;
      isProcessing = true;
      hands.send({image: videoElement}).then(() => {
        isProcessing = false;
      }).catch(err => {
        console.error("Hands tracking error:", err);
        isProcessing = false;
      });
    }
  }
  canvasCtx.restore(); 
  
  blade.update(fingertipPos);
  gameManager.update(blade.getLastSegment(), handDetected, isPinching, fingertipPos, thumbPos);
  
  gameManager.draw(canvasCtx);
  blade.draw(canvasCtx);
  
  requestAnimationFrame(renderLoop);
}

renderLoop();
