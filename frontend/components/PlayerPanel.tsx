import { motion } from 'framer-motion';

export default function PlayerPanel({ player, isActive, isMe }: any) {
  const HEX_COLORS: Record<string, string> = {
    red: '#EF4444', blue: '#3B82F6', green: '#10B981', yellow: '#EAB308'
  };

  const bgColors: Record<string, string> = {
    red: 'bg-red-500/20 border-red-500/50',
    blue: 'bg-blue-500/20 border-blue-500/50',
    green: 'bg-green-500/20 border-green-500/50',
    yellow: 'bg-yellow-500/20 border-yellow-500/50'
  };

  const tokensHome = player.tokens.filter((t: any) => t.position === 56).length;

  return (
    <div className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3
      ${isActive ? 'shadow-lg bg-gray-700/80 scale-[1.02]' : 'bg-gray-800/50 border-transparent'}
      ${isActive ? `border-${player.color}-500 shadow-${player.color}-500/20` : ''}
    `}
    style={{ borderColor: isActive ? HEX_COLORS[player.color] : '' }}
    >
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-inner ${bgColors[player.color]}`}
        style={{ color: HEX_COLORS[player.color] }}
      >
        {player.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <h4 className="font-bold truncate" style={{ color: isActive ? 'white' : '#9CA3AF' }}>
            {player.name}
          </h4>
          {isMe && <span className="text-[10px] bg-gray-600 px-1.5 py-0.5 rounded text-white">YOU</span>}
        </div>

        {player.hasFinished ? (
          <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mt-1">
            Rank: {player.rank}
          </div>
        ) : (
          <div className="flex gap-1 mt-1.5">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full border border-gray-600 transition-colors`}
                style={{ backgroundColor: i <= tokensHome ? HEX_COLORS[player.color] : 'transparent' }}
              />
            ))}
          </div>
        )}
      </div>

      {isActive && !player.hasFinished && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_10px_#4ADE80]"
        />
      )}
    </div>
  );
}
