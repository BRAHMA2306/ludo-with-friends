import { useState, useRef, useEffect } from 'react';

export default function Chat({ socket, gameState, roomId }: any) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [gameState.chat]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    socket.emit('chat_message', { roomId, message: message.trim() });
    setMessage('');
  };

  const HEX_COLORS: Record<string, string> = {
    red: '#EF4444', blue: '#3B82F6', green: '#10B981', yellow: '#EAB308'
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/50">
      <div className="p-3 bg-gray-800 border-y border-gray-700 font-bold text-sm text-gray-300">
        Room Chat
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3 no-scrollbar min-h-[150px]">
        {gameState.chat.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-4 italic">No messages yet. Start chatting!</div>
        ) : (
          gameState.chat.map((msg: any) => {
            const isMe = msg.senderName === gameState.players.find((p:any) => p.id === socket?.id)?.name;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-gray-400 mb-0.5 px-1" style={{ color: HEX_COLORS[msg.senderColor] }}>
                  {msg.senderName}
                </span>
                <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm
                  ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-700 text-gray-100 rounded-tl-sm'}
                `}>
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-gray-800 border-t border-gray-700">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </form>
      </div>
    </div>
  );
}
