import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const BASE_SIZE = 15;
const COLORS = ['red', 'blue', 'green', 'yellow'];
const HEX_COLORS: Record<string, string> = {
  red: '#EF4444', blue: '#3B82F6', green: '#10B981', yellow: '#EAB308', white: '#ffffff', gray: '#374151'
};

// Simplified path matching shared/game-logic (0-14 coordinates)
// For visual rendering, we just need a 15x15 grid layout.
export default function Board({ gameState, socket, myPlayer }: any) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Constants
  const cellSize = 40;
  const boardSize = cellSize * BASE_SIZE;

  const handleTokenClick = (tokenId: string, color: string) => {
    if (gameState.status !== 'playing') return;
    if (color !== myPlayer?.color) return; // Can only click own tokens
    if (gameState.players[gameState.currentTurnIndex]?.id !== socket?.id) return; // Not my turn
    if (gameState.canRoll) return; // Must roll first

    socket.emit('move_token', { roomId: gameState.roomId, tokenId });
  };

  // Rendering the grid
  const renderCells = () => {
    const cells = [];
    for (let y = 0; y < BASE_SIZE; y++) {
      for (let x = 0; x < BASE_SIZE; x++) {
        let fill = 'white';
        const stroke = '#E5E7EB';

        // Colored bases
        if (x < 6 && y < 6) fill = HEX_COLORS.blue; // Top left
        if (x > 8 && y < 6) fill = HEX_COLORS.green; // Top right
        if (x < 6 && y > 8) fill = HEX_COLORS.red; // Bottom left
        if (x > 8 && y > 8) fill = HEX_COLORS.yellow; // Bottom right

        // Home paths
        if (y === 7 && x >= 1 && x <= 5) fill = HEX_COLORS.blue; // Blue home stretch
        if (x === 7 && y >= 1 && y <= 5) fill = HEX_COLORS.green; // Green home stretch
        if (y === 7 && x >= 9 && x <= 13) fill = HEX_COLORS.yellow; // Yellow home stretch
        if (x === 7 && y >= 9 && y <= 13) fill = HEX_COLORS.red; // Red home stretch

        // Start cells
        if (x === 1 && y === 6) fill = HEX_COLORS.blue;
        if (x === 8 && y === 1) fill = HEX_COLORS.green;
        if (x === 13 && y === 8) fill = HEX_COLORS.yellow;
        if (x === 6 && y === 13) fill = HEX_COLORS.red;

        // Center Triangle (Home)
        if (x >= 6 && x <= 8 && y >= 6 && y <= 8) {
          // Handled by a separate polygon overlay
          continue;
        }

        cells.push(
          <rect
            key={`${x}-${y}`}
            x={x * cellSize}
            y={y * cellSize}
            width={cellSize}
            height={cellSize}
            fill={fill}
            stroke={stroke}
            strokeWidth={1}
          />
        );
      }
    }
    return cells;
  };

  const renderBases = () => {
    const bases = [];
    // White inner squares for bases
    const innerOffset = 1.5 * cellSize;
    const innerSize = 3 * cellSize;

    bases.push(<rect key="b1" x={innerOffset} y={innerOffset} width={innerSize} height={innerSize} fill="white" rx={8} />); // Blue
    bases.push(<rect key="b2" x={9 * cellSize + innerOffset} y={innerOffset} width={innerSize} height={innerSize} fill="white" rx={8} />); // Green
    bases.push(<rect key="b3" x={innerOffset} y={9 * cellSize + innerOffset} width={innerSize} height={innerSize} fill="white" rx={8} />); // Red
    bases.push(<rect key="b4" x={9 * cellSize + innerOffset} y={9 * cellSize + innerOffset} width={innerSize} height={innerSize} fill="white" rx={8} />); // Yellow

    // Base circles (where tokens start)
    const renderCircles = (cx: number, cy: number, color: string) => {
      const offsets = [
        {x: -0.75, y: -0.75}, {x: 0.75, y: -0.75},
        {x: -0.75, y: 0.75}, {x: 0.75, y: 0.75}
      ];
      return offsets.map((off, i) => (
        <circle
          key={`${color}-c-${i}`}
          cx={cx + off.x * cellSize}
          cy={cy + off.y * cellSize}
          r={cellSize * 0.4}
          fill="none"
          stroke={HEX_COLORS[color]}
          strokeWidth={2}
        />
      ));
    };

    bases.push(renderCircles(3 * cellSize, 3 * cellSize, 'blue'));
    bases.push(renderCircles(12 * cellSize, 3 * cellSize, 'green'));
    bases.push(renderCircles(3 * cellSize, 12 * cellSize, 'red'));
    bases.push(renderCircles(12 * cellSize, 12 * cellSize, 'yellow'));

    return bases;
  };

  const renderCenterPolygon = () => {
    const cx = 7.5 * cellSize;
    const cy = 7.5 * cellSize;
    const cSize = 1.5 * cellSize;

    return (
      <g>
        {/* Blue Triangle */}
        <polygon points={`${cx - cSize},${cy - cSize} ${cx},${cy} ${cx - cSize},${cy + cSize}`} fill={HEX_COLORS.blue} />
        {/* Green Triangle */}
        <polygon points={`${cx - cSize},${cy - cSize} ${cx + cSize},${cy - cSize} ${cx},${cy}`} fill={HEX_COLORS.green} />
        {/* Yellow Triangle */}
        <polygon points={`${cx + cSize},${cy - cSize} ${cx + cSize},${cy + cSize} ${cx},${cy}`} fill={HEX_COLORS.yellow} />
        {/* Red Triangle */}
        <polygon points={`${cx - cSize},${cy + cSize} ${cx + cSize},${cy + cSize} ${cx},${cy}`} fill={HEX_COLORS.red} />
      </g>
    );
  };

  // Safe star icons
  const renderSafeStars = () => {
    // Hardcoded positions based on standard safe zones (0, 8, 13, 21, 26, 34, 39, 47)
    // Red: 6,13 & 2,8; Blue: 1,6 & 6,2; Green: 8,1 & 12,6; Yellow: 13,8 & 8,12
    const positions = [
      {x: 6, y: 13}, {x: 2, y: 8}, // Red path safe
      {x: 1, y: 6}, {x: 6, y: 2},  // Blue path safe
      {x: 8, y: 1}, {x: 12, y: 6}, // Green path safe
      {x: 13, y: 8}, {x: 8, y: 12} // Yellow path safe
    ];

    return positions.map((p, i) => (
      <text
        key={`star-${i}`}
        x={(p.x + 0.5) * cellSize}
        y={(p.y + 0.65) * cellSize}
        fontSize={20}
        textAnchor="middle"
        fill="#9CA3AF"
      >
        ★
      </text>
    ));
  };

  // Use shared logic getCoordinates to map token positions to x,y
  // For frontend, since we can't directly import from parent without config,
  // we'll implement a duplicate logic or simplified logic here for rendering.
  const getRenderCoordinates = (color: string, position: number, index: number) => {
    // If in base
    if (position === -1) {
      const bases = {
        blue: [{x: 2.25, y: 2.25}, {x: 3.75, y: 2.25}, {x: 2.25, y: 3.75}, {x: 3.75, y: 3.75}],
        green: [{x: 11.25, y: 2.25}, {x: 12.75, y: 2.25}, {x: 11.25, y: 3.75}, {x: 12.75, y: 3.75}],
        red: [{x: 2.25, y: 11.25}, {x: 3.75, y: 11.25}, {x: 2.25, y: 12.75}, {x: 3.75, y: 12.75}],
        yellow: [{x: 11.25, y: 11.25}, {x: 12.75, y: 11.25}, {x: 11.25, y: 12.75}, {x: 12.75, y: 12.75}]
      };
      const p = bases[color as keyof typeof bases][index];
      return { x: p.x * cellSize, y: p.y * cellSize };
    }

    // Home stretches
    if (position >= 51 && position <= 56) {
      const stretchIdx = position - 51;
      const stretches = {
        red: [{x: 7, y: 13}, {x: 7, y: 12}, {x: 7, y: 11}, {x: 7, y: 10}, {x: 7, y: 9}, {x: 7, y: 8}],
        blue: [{x: 1, y: 7}, {x: 2, y: 7}, {x: 3, y: 7}, {x: 4, y: 7}, {x: 5, y: 7}, {x: 6, y: 7}],
        green: [{x: 7, y: 1}, {x: 7, y: 2}, {x: 7, y: 3}, {x: 7, y: 4}, {x: 7, y: 5}, {x: 7, y: 6}],
        yellow: [{x: 13, y: 7}, {x: 12, y: 7}, {x: 11, y: 7}, {x: 10, y: 7}, {x: 9, y: 7}, {x: 8, y: 7}]
      };
      const p = stretches[color as keyof typeof stretches][stretchIdx];
      // Offset slightly if 56 (inside home triangle)
      if (position === 56) {
        const hOffset = { red: {x: 7.5, y: 8}, blue: {x: 7, y: 7.5}, green: {x: 7.5, y: 7}, yellow: {x: 8, y: 7.5} };
        const hop = hOffset[color as keyof typeof hOffset];
        return { x: hop.x * cellSize, y: hop.y * cellSize };
      }
      return { x: (p.x + 0.5) * cellSize, y: (p.y + 0.5) * cellSize };
    }

    // Common path
    const COLOR_OFFSETS = { red: 0, blue: 13, green: 26, yellow: 39 };
    const BOARD_PATH = [
      {x: 6, y: 13}, {x: 6, y: 12}, {x: 6, y: 11}, {x: 6, y: 10}, {x: 6, y: 9},
      {x: 5, y: 8}, {x: 4, y: 8}, {x: 3, y: 8}, {x: 2, y: 8}, {x: 1, y: 8}, {x: 0, y: 8},
      {x: 0, y: 7},
      {x: 0, y: 6}, {x: 1, y: 6}, {x: 2, y: 6}, {x: 3, y: 6}, {x: 4, y: 6}, {x: 5, y: 6},
      {x: 6, y: 5}, {x: 6, y: 4}, {x: 6, y: 3}, {x: 6, y: 2}, {x: 6, y: 1}, {x: 6, y: 0},
      {x: 7, y: 0},
      {x: 8, y: 0}, {x: 8, y: 1}, {x: 8, y: 2}, {x: 8, y: 3}, {x: 8, y: 4}, {x: 8, y: 5},
      {x: 9, y: 6}, {x: 10, y: 6}, {x: 11, y: 6}, {x: 12, y: 6}, {x: 13, y: 6}, {x: 14, y: 6},
      {x: 14, y: 7},
      {x: 14, y: 8}, {x: 13, y: 8}, {x: 12, y: 8}, {x: 11, y: 8}, {x: 10, y: 8}, {x: 9, y: 8},
      {x: 8, y: 9}, {x: 8, y: 10}, {x: 8, y: 11}, {x: 8, y: 12}, {x: 8, y: 13}, {x: 8, y: 14},
      {x: 7, y: 14}
    ];

    const offset = COLOR_OFFSETS[color as keyof typeof COLOR_OFFSETS];
    const gIndex = (offset + position) % 52;
    const p = BOARD_PATH[gIndex];
    return { x: (p.x + 0.5) * cellSize, y: (p.y + 0.5) * cellSize };
  };

  // Group tokens by identical position to offset them slightly so they don't overlap completely
  const allTokens = gameState.players.flatMap((p: any) => p.tokens.map((t: any) => ({ ...t, playerId: p.id })));
  const positionMap = new Map();
  allTokens.forEach((t: any) => {
    if (t.position === -1) return; // Ignore base overlaps
    if (t.position === 56) return; // Ignore home overlaps

    // Convert to global index for common path overlaps
    let key;
    if (t.position >= 51 && t.position <= 55) {
      key = `${t.color}-home-${t.position}`;
    } else {
      const COLOR_OFFSETS = { red: 0, blue: 13, green: 26, yellow: 39 };
      key = `global-${(COLOR_OFFSETS[t.color as keyof typeof COLOR_OFFSETS] + t.position) % 52}`;
    }

    if (!positionMap.has(key)) positionMap.set(key, []);
    positionMap.get(key).push(t.id);
  });

  return (
    <div className="relative w-full max-w-2xl aspect-square bg-white rounded-xl shadow-2xl p-2 md:p-4 overflow-hidden border-4 border-gray-800">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${boardSize} ${boardSize}`}
        className="w-full h-full drop-shadow-md"
      >
        <g>
          {renderCells()}
          {renderCenterPolygon()}
          {renderBases()}
          {renderSafeStars()}
        </g>
      </svg>

      {/* Render Tokens as HTML elements over the SVG for easy Framer Motion animation */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-2 md:p-4" style={{ padding: 'inherit' }}>
        <div className="relative w-full h-full">
          {allTokens.map((t: any, i: number) => {
            const indexInPlayer = parseInt(t.id.split('-')[1]) - 1;
            const rawPos = getRenderCoordinates(t.color, t.position, indexInPlayer);

            // Calculate overlap offset
            let offsetX = 0;
            let offsetY = 0;

            if (t.position !== -1 && t.position !== 56) {
              let key;
              if (t.position >= 51 && t.position <= 55) {
                key = `${t.color}-home-${t.position}`;
              } else {
                const COLOR_OFFSETS = { red: 0, blue: 13, green: 26, yellow: 39 };
                key = `global-${(COLOR_OFFSETS[t.color as keyof typeof COLOR_OFFSETS] + t.position) % 52}`;
              }
              const overlaps = positionMap.get(key);
              if (overlaps && overlaps.length > 1) {
                const overlapIdx = overlaps.indexOf(t.id);
                // Grid layout for overlaps
                const offsetAmount = 6;
                if (overlaps.length === 2) {
                  offsetX = overlapIdx === 0 ? -offsetAmount : offsetAmount;
                } else {
                  offsetX = overlapIdx % 2 === 0 ? -offsetAmount : offsetAmount;
                  offsetY = overlapIdx < 2 ? -offsetAmount : offsetAmount;
                }
              }
            }

            // Transform raw pixel coordinates to percentage for responsiveness
            const leftPct = (rawPos.x / boardSize) * 100;
            const topPct = (rawPos.y / boardSize) * 100;

            const isMyTurn = gameState.status === 'playing' && gameState.players[gameState.currentTurnIndex]?.id === myPlayer?.id;
            const isClickable = isMyTurn && t.playerId === myPlayer?.id && !gameState.canRoll;
            const highlight = isClickable && (t.position !== -1 || gameState.diceValue === 6) && t.position !== 56;

            return (
              <motion.div
                key={t.id}
                layout
                initial={false}
                animate={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  x: `-50%`,
                  y: `-50%`,
                  scale: highlight ? [1, 1.2, 1] : t.position === 56 ? 0.7 : 1,
                  marginLeft: offsetX,
                  marginTop: offsetY
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  scale: highlight ? { repeat: Infinity, duration: 1 } : { duration: 0.2 }
                }}
                className={`absolute w-[6%] h-[6%] rounded-full shadow-lg border-2 pointer-events-auto flex items-center justify-center
                  ${highlight ? 'cursor-pointer ring-4 ring-white ring-opacity-50 z-20' : 'z-10'}
                  ${t.position === 56 ? 'opacity-80' : ''}
                `}
                style={{
                  backgroundColor: HEX_COLORS[t.color],
                  borderColor: 'rgba(255,255,255,0.8)'
                }}
                onClick={() => handleTokenClick(t.id, t.color)}
              >
                {/* Inner shine effect */}
                <div className="w-1/2 h-1/2 bg-white rounded-full opacity-30 transform -translate-y-1" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
