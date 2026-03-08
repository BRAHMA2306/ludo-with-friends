import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function Dice({ socket, gameState, isMyTurn, roomId }: any) {
  const [rolling, setRolling] = useState(false);
  const [visualValue, setVisualValue] = useState(1);

  const canRoll = isMyTurn && gameState.canRoll;

  // Watch for external dice changes
  useEffect(() => {
    if (gameState.diceValue && gameState.lastDiceRollTime) {
      setRolling(true); // eslint-disable-line react-hooks/exhaustive-deps
      const interval = setInterval(() => {
        setVisualValue(Math.floor(Math.random() * 6) + 1);
      }, 50);

      setTimeout(() => {
        clearInterval(interval);
        setVisualValue(gameState.diceValue);
        setRolling(false);
      }, 600);
    }
  }, [gameState.diceValue, gameState.lastDiceRollTime]);

  const handleRoll = () => {
    if (!canRoll || rolling) return;
    socket.emit('roll_dice', { roomId });
  };

  const dots = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [25, 75], [75, 25], [75, 75]],
    5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
    6: [[25, 20], [25, 50], [25, 80], [75, 20], [75, 50], [75, 80]]
  };

  const currentDots = dots[visualValue as keyof typeof dots] || dots[1];

  return (
    <div className="flex flex-col items-center">
      <div className="h-8 mb-2 font-bold text-gray-300">
        {isMyTurn ? (
          gameState.canRoll ? (
            <span className="text-green-400 animate-pulse">Your turn to roll!</span>
          ) : (
            <span className="text-blue-400">Move a token</span>
          )
        ) : (
          <span>Waiting for {gameState.players[gameState.currentTurnIndex]?.name}</span>
        )}
      </div>

      <motion.button
        onClick={handleRoll}
        disabled={!canRoll || rolling}
        className={`relative w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center focus:outline-none
          ${canRoll && !rolling ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed opacity-80'}
          ${canRoll ? 'ring-4 ring-green-500 ring-offset-4 ring-offset-gray-900' : ''}
        `}
        animate={{
          rotateX: rolling ? [0, 360, 720, 1080] : 0,
          rotateY: rolling ? [0, 360, 720, 1080] : 0,
          scale: rolling ? [1, 1.2, 1] : canRoll ? [1, 1.05, 1] : 1
        }}
        transition={{
          rotateX: { duration: 0.6, ease: "linear" },
          rotateY: { duration: 0.6, ease: "linear" },
          scale: rolling ? { duration: 0.6 } : { repeat: Infinity, duration: 1.5 }
        }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="absolute inset-2 bg-gradient-to-br from-gray-100 to-gray-300 rounded-xl pointer-events-none">
          {currentDots.map((pos, i) => (
            <div
              key={i}
              className="absolute w-4 h-4 bg-gray-900 rounded-full shadow-inner"
              style={{
                left: `${pos[0]}%`,
                top: `${pos[1]}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}
        </div>
      </motion.button>

      {/* 6 Streak indicator */}
      {gameState.sixCount > 0 && (
        <div className="mt-4 flex gap-2">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${i <= gameState.sixCount ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}
            />
          ))}
        </div>
      )}
      {gameState.sixCount === 3 && (
        <span className="text-red-400 text-sm mt-1 font-bold">Penalty! (Three 6s)</span>
      )}
    </div>
  );
}
