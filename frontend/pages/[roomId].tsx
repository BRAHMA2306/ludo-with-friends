import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { io, Socket } from 'socket.io-client';
import Head from 'next/head';
import Board from '@/components/Board';
import Dice from '@/components/Dice';
import PlayerPanel from '@/components/PlayerPanel';
import Chat from '@/components/Chat';

// Types matched from shared/game-logic.ts
interface Token { id: string; color: string; position: number; isSafe: boolean; }
interface Player { id: string; name: string; color: string; isHost: boolean; tokens: Token[]; hasFinished: boolean; rank: number | null; }
interface ChatMessage { id: string; senderName: string; senderColor: string; message: string; timestamp: number; }
interface GameState {
  roomId: string; players: Player[]; currentTurnIndex: number; diceValue: number | null;
  status: 'lobby' | 'playing' | 'finished'; winnerRanks: string[]; lastDiceRollTime: number; canRoll: boolean; sixCount: number; chat: ChatMessage[];
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://ludo-backend-vzpd.onrender.com/';

export default function RoomPage() {
  const router = useRouter();
  const { roomId, name, action } = router.query;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    if (!roomId || !name || !action) {
      router.push('/');
      return;
    }

    const newSocket = io("https://ludo-backend-vzpd.onrender.com", {
  path: "/socket.io",
  transports: ["polling", "websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000
});
    setSocket(newSocket); // eslint-disable-line react-hooks/exhaustive-deps

    newSocket.on('connect', () => {
      if (action === 'create') {
        newSocket.emit('create_room', { roomId, playerName: name });
      } else if (action === 'join') {
        newSocket.emit('join_room', { roomId, playerName: name });
      }
    });

    newSocket.on('game_state_update', (state: GameState) => {
      setGameState(state);
    });

    newSocket.on('error', (err: { message: string }) => {
      setError(err.message);
      newSocket.disconnect();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [router.isReady, roomId, name, action]);

  const copyLink = () => {
    const link = `${window.location.origin}/?roomCode=${roomId}&action=join`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startGame = () => {
    if (socket) socket.emit('start_game', { roomId });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 text-center">
        <div className="bg-red-500/20 text-red-400 p-6 rounded-2xl max-w-md w-full border border-red-500/30">
          <h2 className="text-2xl font-bold mb-2">Error Joining Game</h2>
          <p className="mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-white text-gray-900 px-6 py-2 rounded-lg font-bold hover:bg-gray-200"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return <div className="flex items-center justify-center min-h-screen text-xl text-gray-400">Connecting...</div>;
  }

  const myPlayer = gameState.players.find(p => p.id === socket?.id);
  const isMyTurn = gameState.status === 'playing' && gameState.players[gameState.currentTurnIndex]?.id === socket?.id;

  if (gameState.status === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900">
        <div className="bg-gray-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Room Lobby</h1>
            <div className="flex items-center justify-center gap-2 bg-gray-900 py-3 px-4 rounded-xl border border-gray-700">
              <span className="text-gray-400">Code:</span>
              <span className="text-2xl font-mono text-green-400 font-bold tracking-widest">{gameState.roomId}</span>
            </div>
            <button
              onClick={copyLink}
              className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {copied ? '✓ Copied to clipboard' : 'Click to copy invite link'}
            </button>
          </div>

          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-medium text-gray-300">Players ({gameState.players.length}/4)</h3>
            {gameState.players.map((p, i) => (
              <div key={p.id} className="flex items-center gap-4 bg-gray-900 p-4 rounded-xl border border-gray-700/50">
                <div className={`w-4 h-4 rounded-full bg-${p.color}-500 shadow-[0_0_10px_currentColor]`} style={{ backgroundColor: getCSSColor(p.color) }} />
                <span className="flex-1 font-medium text-lg">{p.name} {p.id === socket?.id && '(You)'}</span>
                {p.isHost && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-md font-bold uppercase tracking-wider">Host</span>}
              </div>
            ))}
            {Array.from({ length: 4 - gameState.players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800 border-dashed">
                <div className="w-4 h-4 rounded-full bg-gray-700" />
                <span className="flex-1 text-gray-600 italic">Waiting for player...</span>
              </div>
            ))}
          </div>

          {myPlayer?.isHost ? (
            <button
              onClick={startGame}
              disabled={gameState.players.length < 2}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                gameState.players.length >= 2
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Start Game
            </button>
          ) : (
            <div className="text-center text-gray-400 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
              Waiting for host to start the game...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-gray-900 overflow-hidden text-white relative">
      <Head>
        <title>Ludo - Room {gameState.roomId}</title>
      </Head>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col relative h-full">
        {/* Top Info Bar */}
        <div className="h-16 flex items-center justify-between px-4 bg-gray-800/50 border-b border-gray-700/50 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="font-mono bg-black/50 px-3 py-1 rounded-lg text-sm font-bold tracking-wider border border-gray-700">
              {gameState.roomId}
            </div>
          </div>
          <button
            className="md:hidden text-gray-300 p-2"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {/* Simple Menu Icon */}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>

        {/* Board Area */}
        <div className="flex-1 flex items-center justify-center p-2 relative overflow-hidden">
           <Board gameState={gameState} socket={socket} myPlayer={myPlayer} />
        </div>

        {/* Dice Area Mobile (Bottom) */}
        <div className="md:hidden p-4 bg-gray-800/80 border-t border-gray-700 flex justify-center items-center backdrop-blur-md">
           <Dice
             socket={socket}
             gameState={gameState}
             isMyTurn={isMyTurn}
             roomId={roomId as string}
           />
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) / Sidebar Panel (Desktop) */}
      <div className={`
        fixed inset-y-0 right-0 w-80 bg-gray-800 border-l border-gray-700 transform transition-transform duration-300 ease-in-out z-50 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        md:relative md:translate-x-0 md:flex shadow-2xl
      `}>
        {/* Mobile close btn */}
        <div className="md:hidden absolute top-4 right-4 z-50">
          <button onClick={() => setIsSidebarOpen(false)} className="bg-gray-700 p-2 rounded-full">
             <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Players List */}
        <div className="p-4 border-b border-gray-700 bg-gray-800/50">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Players</h3>
          <div className="space-y-2">
            {gameState.players.map((p, i) => (
              <PlayerPanel key={p.id} player={p} isActive={gameState.currentTurnIndex === i} isMe={p.id === socket?.id} />
            ))}
          </div>
        </div>

        {/* Dice Area Desktop */}
        <div className="hidden md:flex p-6 border-b border-gray-700 justify-center items-center bg-gray-900/30">
           <Dice
             socket={socket}
             gameState={gameState}
             isMyTurn={isMyTurn}
             roomId={roomId as string}
           />
        </div>

        {/* Chat */}
        <div className="flex-1 min-h-0 flex flex-col bg-gray-900/50">
          <Chat socket={socket} gameState={gameState} roomId={roomId as string} />
        </div>
      </div>

      {/* Mobile Sidebar Overlay Dim */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

// Utility
function getCSSColor(colorName: string) {
  const map: Record<string, string> = {
    red: '#EF4444', blue: '#3B82F6', green: '#10B981', yellow: '#EAB308'
  };
  return map[colorName] || '#fff';
}
