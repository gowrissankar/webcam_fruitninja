// --- DISPLAY SETTINGS ---
export const WIDTH = 1280;
export const HEIGHT = 720;
export const FPS = 60;
export const DEBUG_MODE = true;

// --- GAME STATES ---
export const STATE_START = 0;
export const STATE_RUNNING = 1;
export const STATE_PAUSED = 2;
export const STATE_NO_HAND = 3;
export const STATE_GAME_OVER = 4;

// --- PHYSICS & SPAWN CONSTANTS ---
export const GRAVITY = 0.8; // Increased for tighter arcs
export const FRUIT_SIZE = 30; // Radius
export const INITIAL_Y_VELOCITY_MIN = -25; // Reaches at least 50% screen height
export const INITIAL_Y_VELOCITY_MAX = -31; // Reaches up to 90% screen height
export const HORIZONTAL_DRIFT_RANGE = 3; // -3 to +3 vx
export const HALF_HORIZONTAL_SPLIT_SPEED = 4; // Velocity when split

export const BOMB_SPAWN_CHANCE = 0.15; // 15% chance per spawned object

// --- WAVE TIMING ---
export const WAVE_DELAY_MIN = 45; // Minimum frames between waves
export const WAVE_DELAY_MAX = 90; // Maximum frames between waves
export const BURST_DELAY_MIN = 5; // Frames between objects in a burst
export const BURST_DELAY_MAX = 15;

// --- COMBO TIMING ---
export const COMBO_TIME_WINDOW = 20; // Frames to string together a combo

// --- GESTURES & TRACKING ---
export const PINCH_THRESHOLD = 40; // Euclidean distance
export const PINCH_HOLD_DURATION = 24; // Frames (~400ms at 60fps)
export const TRACKING_LOSS_TOLERANCE_MS = 1000; // 1 second delay before pause

// --- BLADE VISUALS ---
export const BLADE_SMOOTHING_FACTOR = 0.5; // EMA alpha
export const MAX_BLADE_TRAIL_LENGTH = 12; // Length of history
export const SLASH_RADIUS_FORGIVENESS = 1.0; // Multiplier for hit radius

// --- PLAYER STATS ---
export const LIVES_COUNT = 3;
