// ==========================================
// --- DISPLAY SETTINGS ---
// ==========================================
export const WIDTH = 1280; // Game coordinate width (virtual resolution)
export const HEIGHT = 720; // Game coordinate height (virtual resolution)
export const FPS = 60;     // Target calculations per second
export const DEBUG_MODE = false; // Toggle to render the MediaPipe skeleton overlay wireframe

// ==========================================
// --- GAME STATES ---
// ==========================================
export const STATE_START = 0;
export const STATE_RUNNING = 1;
export const STATE_PAUSED = 2;
export const STATE_NO_HAND = 3;
export const STATE_GAME_OVER = 4;
export const STATE_COUNTDOWN = 5;
export const STATE_DYING = 6;

// ==========================================
// --- PHYSICS & SPAWN CONSTANTS ---
// ==========================================
// GRAVITY: Downward acceleration per frame. 
// Set to 0.75 for highly realistic, floaty parabolic tosses where fruits reach their peak gracefully.
// [Recommended Range: 0.6 (very floaty) - 1.0 (heavy)]
export const GRAVITY = 1.2;

export const FRUIT_SIZE = 30; // Hitbox radius of fruits in pixels (increase to make slicing easier)
//note : existing issue one change of size ( def:30 ) 

// Height boundaries (expressed as % of screen height from the bottom) that launched fruits are guaranteed to reach
export const MIN_HEIGHT_PCT = 0.60; // Guaranteed to reach at least 60% screen height
export const MAX_HEIGHT_PCT = 0.85; // Guaranteed to reach at most 85% screen height

// Projectile Kinematics (vy = -sqrt(2 * g * distance))
// Calculates initial vertical launch velocities automatically so fruits always land perfectly within your height percentage boundaries, regardless of gravity!
const Y_SPAWN = HEIGHT + FRUIT_SIZE * 2;
const D_MIN = Y_SPAWN - HEIGHT * (1 - MIN_HEIGHT_PCT);
const D_MAX = Y_SPAWN - HEIGHT * (1 - MAX_HEIGHT_PCT);

export const INITIAL_Y_VELOCITY_MIN = -Math.sqrt(2 * GRAVITY * D_MIN);
export const INITIAL_Y_VELOCITY_MAX = -Math.sqrt(2 * GRAVITY * D_MAX);

// HORIZONTAL_DRIFT_RANGE: Maximum sideways launch speed.
// [Recommended Range: 1.5 (narrow launch) - 3.5 (wide diagonal drift)]
export const HORIZONTAL_DRIFT_RANGE = 3.0;

// HALF_HORIZONTAL_SPLIT_SPEED: Sideways speed at which sliced fruit halves fly apart.
// [Recommended Range: 3.0 - 4.5]
export const HALF_HORIZONTAL_SPLIT_SPEED = 3.6;

// BOMB_SPAWN_CHANCE: Frequency of bomb spawns per object.
// Set to 0.14 (14% chance).
// [Recommended Range: 0.05 (easy/rare) - 0.25 (dense/dangerous)]
export const BOMB_SPAWN_CHANCE = 0.14;

// ==========================================
// --- WAVE TIMING ---
// ==========================================
// WAVE_DELAY (expressed in frames): Waiting time between scheduled waves.
// [Recommended Range: 30 (extreme speed) - 90 (relaxed pacing)]
export const WAVE_DELAY_MIN = 45; // Minimum delay between waves
export const WAVE_DELAY_MAX = 80; // Maximum delay between waves

// BURST_DELAY (expressed in frames): Tiny spacing delays when spawning multiple fruits in a single wave.
export const BURST_DELAY_MIN = 5;
export const BURST_DELAY_MAX = 15;

// ==========================================
// --- COMBO TIMING ---
// ==========================================
// COMBO_TIME_WINDOW: Maximum frames allowed between slices to chain them together as a combo.
export const COMBO_TIME_WINDOW = 20; // 20 frames is ~330ms at 60 FPS

// ==========================================
// --- GESTURES & TRACKING ---
// ==========================================
export const PINCH_THRESHOLD = 40; // Max distance in pixels between index and thumb to count as a pinch
export const PINCH_HOLD_DURATION = 24; // Frames pinch must be held to register a pause trigger (~400ms)
export const TRACKING_LOSS_TOLERANCE_MS = 1000; // Time (ms) to tolerate hand detection loss before auto-pausing

// ==========================================
// --- BLADE VISUALS ---
// ==========================================
export const BLADE_SMOOTHING_FACTOR = 0.5; // Exponential Moving Average smoothing factor for blade coordinates
export const MAX_BLADE_TRAIL_LENGTH = 12; // Length of the glowing trail history drawn on screen
export const SLASH_RADIUS_FORGIVENESS = 1.0; // Hitbox multiplier for your blade slash sweep radius

// ==========================================
// --- PLAYER STATS ---
// ==========================================
export const LIVES_COUNT = 3; // Starting heart lives in Classic mode
