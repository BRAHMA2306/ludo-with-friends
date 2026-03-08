const { getGameState, setGameState } = require('./redis');

// These constants match the shared game-logic
const COLORS = ['red', 'blue', 'green', 'yellow'];
const SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47];
const COLOR_OFFSETS = { red: 0, blue: 13, green: 26, yellow: 39 };

function getInitialGameState(roomId) {
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

function createTokens(color) {
  return [1, 2, 3, 4].map(num => ({
    id: `${color}-${num}`,
    color,
    position: -1, // -1 means in base
    isSafe: true
  }));
}

function getGlobalPathIndex(color, position) {
  if (position < 0 || position > 50) return -1;
  const colorOffset = COLOR_OFFSETS[color];
  return (colorOffset + position) % 52;
}

function isGlobalSafeZone(globalIndex) {
  return SAFE_ZONES.includes(globalIndex);
}

module.exports = function setupSockets(io) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create Room
    socket.on('create_room', async ({ roomId, playerName }) => {
      let state = await getGameState(roomId);
      if (state) {
        socket.emit('error', { message: 'Room already exists' });
        return;
      }

      state = getInitialGameState(roomId);
      const player = {
        id: socket.id,
        name: playerName,
        color: COLORS[0],
        isHost: true,
        tokens: createTokens(COLORS[0]),
        hasFinished: false,
        rank: null
      };

      state.players.push(player);
      await setGameState(roomId, state);
      socket.join(roomId);

      socket.emit('room_created', state);
      io.to(roomId).emit('game_state_update', state);
    });

    // Join Room
    socket.on('join_room', async ({ roomId, playerName }) => {
      let state = await getGameState(roomId);
      if (!state) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (state.status !== 'lobby') {
        socket.emit('error', { message: 'Game already started' });
        return;
      }

      if (state.players.length >= 4) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      const existingPlayer = state.players.find(p => p.id === socket.id);
      if (existingPlayer) {
        socket.emit('error', { message: 'Already in room' });
        return;
      }

      const assignedColor = COLORS[state.players.length];
      const player = {
        id: socket.id,
        name: playerName,
        color: assignedColor,
        isHost: false,
        tokens: createTokens(assignedColor),
        hasFinished: false,
        rank: null
      };

      state.players.push(player);
      await setGameState(roomId, state);
      socket.join(roomId);

      io.to(roomId).emit('game_state_update', state);
    });

    // Start Game
    socket.on('start_game', async ({ roomId }) => {
      let state = await getGameState(roomId);
      if (!state) return;

      const player = state.players.find(p => p.id === socket.id);
      if (!player || !player.isHost) return;

      if (state.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start' });
        return;
      }

      state.status = 'playing';
      state.currentTurnIndex = 0;
      await setGameState(roomId, state);

      io.to(roomId).emit('game_state_update', state);
    });

    // Roll Dice
    socket.on('roll_dice', async ({ roomId }) => {
      let state = await getGameState(roomId);
      if (!state || state.status !== 'playing') return;

      const currentPlayer = state.players[state.currentTurnIndex];
      if (currentPlayer.id !== socket.id) return;
      if (!state.canRoll) return;

      const diceValue = Math.floor(Math.random() * 6) + 1;
      state.diceValue = diceValue;
      state.lastDiceRollTime = Date.now();
      state.canRoll = false;

      if (diceValue === 6) {
        state.sixCount += 1;
      } else {
        state.sixCount = 0;
      }

      // Check if any valid moves exist
      let hasValidMove = false;
      for (const token of currentPlayer.tokens) {
        if (token.position === -1 && diceValue === 6) hasValidMove = true;
        if (token.position > -1 && token.position + diceValue <= 56) hasValidMove = true;
      }

      if (state.sixCount === 3) {
        // Penalty for three 6s
        state.sixCount = 0;
        state.diceValue = null;
        state.canRoll = true;
        nextTurn(state);
      } else if (!hasValidMove) {
        // No valid moves, next turn immediately
        state.canRoll = true;
        if (diceValue !== 6) {
          nextTurn(state);
        }
      }

      await setGameState(roomId, state);
      io.to(roomId).emit('game_state_update', state);
    });

    // Move Token
    socket.on('move_token', async ({ roomId, tokenId }) => {
      let state = await getGameState(roomId);
      if (!state || state.status !== 'playing') return;

      const currentPlayer = state.players[state.currentTurnIndex];
      if (currentPlayer.id !== socket.id) return;
      if (state.canRoll) return; // Must roll first

      const token = currentPlayer.tokens.find(t => t.id === tokenId);
      if (!token) return;

      const diceValue = state.diceValue;

      // Validate move
      if (token.position === -1 && diceValue !== 6) return;
      if (token.position + diceValue > 56) return;

      // Calculate new position
      let newPosition = token.position === -1 ? 0 : token.position + diceValue;
      token.position = newPosition;

      let gotExtraTurn = false;

      // Reached home?
      if (newPosition === 56) {
        gotExtraTurn = true; // Extra turn for reaching home
      }

      // Check for kills
      const globalIndex = getGlobalPathIndex(currentPlayer.color, newPosition);
      if (globalIndex !== -1 && !isGlobalSafeZone(globalIndex)) {
        for (const otherPlayer of state.players) {
          if (otherPlayer.id === currentPlayer.id) continue;

          for (const otherToken of otherPlayer.tokens) {
            const otherGlobalIndex = getGlobalPathIndex(otherPlayer.color, otherToken.position);
            if (otherGlobalIndex === globalIndex) {
              // Kill!
              otherToken.position = -1; // Send back to base
              gotExtraTurn = true;
            }
          }
        }
      }

      // Check win condition
      const hasWon = currentPlayer.tokens.every(t => t.position === 56);
      if (hasWon && !currentPlayer.hasFinished) {
        currentPlayer.hasFinished = true;
        currentPlayer.rank = state.winnerRanks.length + 1;
        state.winnerRanks.push(currentPlayer.id);
      }

      // Check game end
      if (state.winnerRanks.length >= state.players.length - 1) {
        state.status = 'finished';
        const lastPlayer = state.players.find(p => !p.hasFinished);
        if (lastPlayer) {
          lastPlayer.hasFinished = true;
          lastPlayer.rank = state.players.length;
          state.winnerRanks.push(lastPlayer.id);
        }
      }

      // Decide next turn
      state.canRoll = true;
      if (diceValue !== 6 && !gotExtraTurn && state.status === 'playing') {
        state.sixCount = 0;
        nextTurn(state);
      }

      await setGameState(roomId, state);
      io.to(roomId).emit('game_state_update', state);
    });

    // Chat Message
    socket.on('chat_message', async ({ roomId, message }) => {
      let state = await getGameState(roomId);
      if (!state) return;

      const player = state.players.find(p => p.id === socket.id);
      if (!player) return;

      const chatMsg = {
        id: Math.random().toString(36).substr(2, 9),
        senderName: player.name,
        senderColor: player.color,
        message,
        timestamp: Date.now()
      };

      state.chat.push(chatMsg);
      // Keep only last 50 messages
      if (state.chat.length > 50) state.chat.shift();

      await setGameState(roomId, state);
      io.to(roomId).emit('game_state_update', state);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Handle player leaving logic if necessary
      // For now, allow reconnect by keeping the state or remove if lobby
    });
  });

  function nextTurn(state) {
    let nextIndex = state.currentTurnIndex;
    let iterations = 0;
    do {
      nextIndex = (nextIndex + 1) % state.players.length;
      iterations++;
    } while (state.players[nextIndex].hasFinished && iterations < state.players.length);
    state.currentTurnIndex = nextIndex;
  }
};
