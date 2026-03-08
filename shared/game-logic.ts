// Constants for the game
export const COLORS = ['red', 'blue', 'green', 'yellow'];

// Safe zones index (using a unified path, 0-51 are standard path, 52-56 is home stretch for each color)
// A common approach is each color has its own 0-56 path.
// Standard path has 52 cells.
// Safe zones on the common 52-cell track:
export const SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47];

export interface Token {
  id: string; // e.g., 'red-1'
  color: string;
  position: number; // -1: base, 0-50: common track, 51-56: home stretch, 57: home
  isSafe: boolean;
}

export interface Player {
  id: string; // socket id
  name: string;
  color: string; // 'red', 'blue', 'green', 'yellow'
  isHost: boolean;
  tokens: Token[];
  hasFinished: boolean;
  rank: number | null;
}

export interface GameState {
  roomId: string;
  players: Player[];
  currentTurnIndex: number; // Index in the players array
  diceValue: number | null;
  status: 'lobby' | 'playing' | 'finished';
  winnerRanks: string[]; // array of player ids who finished
  lastDiceRollTime: number; // for animations
  canRoll: boolean; // true if the current player needs to roll, false if they need to move
  sixCount: number; // how many consecutive 6s
  chat: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderColor: string;
  message: string;
  timestamp: number;
}

// Convert common path index (0-51) to coordinates on a 15x15 grid (0 to 14)
// This is a simplified coordinate mapping.
// Ludo board standard path coordinates (clock-wise starting from Red's starting square)
// Red starting square is typically at index 0 (if red starts first).
export const BOARD_PATH = [
  // RED path (bottom-left to top-left)
  {x: 6, y: 13}, {x: 6, y: 12}, {x: 6, y: 11}, {x: 6, y: 10}, {x: 6, y: 9},
  {x: 5, y: 8}, {x: 4, y: 8}, {x: 3, y: 8}, {x: 2, y: 8}, {x: 1, y: 8}, {x: 0, y: 8},
  {x: 0, y: 7}, // Top of left arm
  // BLUE path
  {x: 0, y: 6}, {x: 1, y: 6}, {x: 2, y: 6}, {x: 3, y: 6}, {x: 4, y: 6}, {x: 5, y: 6},
  {x: 6, y: 5}, {x: 6, y: 4}, {x: 6, y: 3}, {x: 6, y: 2}, {x: 6, y: 1}, {x: 6, y: 0},
  {x: 7, y: 0}, // Right of top arm
  // GREEN path
  {x: 8, y: 0}, {x: 8, y: 1}, {x: 8, y: 2}, {x: 8, y: 3}, {x: 8, y: 4}, {x: 8, y: 5},
  {x: 9, y: 6}, {x: 10, y: 6}, {x: 11, y: 6}, {x: 12, y: 6}, {x: 13, y: 6}, {x: 14, y: 6},
  {x: 14, y: 7}, // Bottom of right arm
  // YELLOW path
  {x: 14, y: 8}, {x: 13, y: 8}, {x: 12, y: 8}, {x: 11, y: 8}, {x: 10, y: 8}, {x: 9, y: 8},
  {x: 8, y: 9}, {x: 8, y: 10}, {x: 8, y: 11}, {x: 8, y: 12}, {x: 8, y: 13}, {x: 8, y: 14},
  {x: 7, y: 14} // Left of bottom arm
];

// Home stretch paths
export const HOME_STRETCHES = {
  red: [
    {x: 7, y: 13}, {x: 7, y: 12}, {x: 7, y: 11}, {x: 7, y: 10}, {x: 7, y: 9}, {x: 7, y: 8} // Home center
  ],
  blue: [
    {x: 1, y: 7}, {x: 2, y: 7}, {x: 3, y: 7}, {x: 4, y: 7}, {x: 5, y: 7}, {x: 6, y: 7} // Home center
  ],
  green: [
    {x: 7, y: 1}, {x: 7, y: 2}, {x: 7, y: 3}, {x: 7, y: 4}, {x: 7, y: 5}, {x: 7, y: 6} // Home center
  ],
  yellow: [
    {x: 13, y: 7}, {x: 12, y: 7}, {x: 11, y: 7}, {x: 10, y: 7}, {x: 9, y: 7}, {x: 8, y: 7} // Home center
  ]
};

// Base positions
export const BASE_POSITIONS = {
  red: [{x: 2, y: 11}, {x: 4, y: 11}, {x: 2, y: 13}, {x: 4, y: 13}],
  blue: [{x: 2, y: 2}, {x: 4, y: 2}, {x: 2, y: 4}, {x: 4, y: 4}],
  green: [{x: 11, y: 2}, {x: 13, y: 2}, {x: 11, y: 4}, {x: 13, y: 4}],
  yellow: [{x: 11, y: 11}, {x: 13, y: 11}, {x: 11, y: 13}, {x: 13, y: 13}],
};

export const COLOR_OFFSETS = {
  red: 0,
  blue: 13,
  green: 26,
  yellow: 39
};

export function getInitialGameState(roomId: string): GameState {
  return {
    roomId,
    players: [],
    currentTurnIndex: 0,
    diceValue: null,
    status: 'lobby',
    winnerRanks: [],
    lastDiceRollTime: 0,
    canRoll: true,
    sixCount: 0,
    chat: []
  };
}

export function createTokens(color: string): Token[] {
  return [1, 2, 3, 4].map(num => ({
    id: `${color}-${num}`,
    color,
    position: -1, // -1 means in base
    isSafe: true
  }));
}

// Check if a move is valid
export function isValidMove(token: Token, dice: number): boolean {
  if (token.position === -1) {
    return dice === 6; // Can only leave base with a 6
  }
  if (token.position + dice > 56) {
    return false; // Needs exact roll to reach home (position 56)
  }
  return true;
}

// Calculate new position
export function calculateNewPosition(token: Token, dice: number): number {
  if (token.position === -1 && dice === 6) {
    return 0; // Starts at 0 relative to their own path
  }
  return token.position + dice;
}

// Check if all tokens for a player are home
export function hasPlayerWon(player: Player): boolean {
  return player.tokens.every(t => t.position === 56);
}

// Get global coordinate for rendering
export function getCoordinates(color: string, position: number, offsetForOverlaps = 0) {
  if (position === -1) {
    // Return to base, offsetForOverlaps is just the token index 0-3
    return BASE_POSITIONS[color as keyof typeof BASE_POSITIONS][offsetForOverlaps];
  }

  if (position >= 51 && position <= 56) {
    const stretchIndex = position - 51; // 0 to 5
    return HOME_STRETCHES[color as keyof typeof HOME_STRETCHES][stretchIndex];
  }

  // Common path
  const colorOffset = COLOR_OFFSETS[color as keyof typeof COLOR_OFFSETS];
  const globalIndex = (colorOffset + position) % 52;
  return BOARD_PATH[globalIndex];
}

// Get global path index to check for collisions
export function getGlobalPathIndex(color: string, position: number): number {
  if (position < 0 || position > 50) return -1; // Not on common path
  const colorOffset = COLOR_OFFSETS[color as keyof typeof COLOR_OFFSETS];
  return (colorOffset + position) % 52;
}

// Determine if a position is a safe zone (using global path index)
export function isGlobalSafeZone(globalIndex: number): boolean {
  return SAFE_ZONES.includes(globalIndex);
}
