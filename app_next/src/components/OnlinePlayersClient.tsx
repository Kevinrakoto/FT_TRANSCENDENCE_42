'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { chatSocket } from '@/lib/socket-client';

type OnlinePlayer = {
  userId: string;
  username: string;
  tankName?: string;
  socketId: string;
};

type Message = {
  id: string;
  content: string;
  timestamp: number;
  room_name: string;
  user: string;
};

export default function OnlinePlayersClient() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; tankName?: string } | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [myFriends, setMyFriends] = useState<string[]>([]);
  const [chatWith, setChatWith] = useState<OnlinePlayer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then(data => {
        setCurrentUser(data.user);
      })
      .catch(() => router.push('/signin'));
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;
    fetch('/api/friends/list', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setMyFriends(data.map((f: any) => String(f.id))));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    chatSocket.connect(currentUser.id, currentUser.username, currentUser.tankName);

    const onPlayersUpdate = (players: OnlinePlayer[]) => {
      setOnlinePlayers(players.filter(p => p.userId !== currentUser.id));
    };

    const onNewMessage = (msg: Message) => {
      if (chatWith && msg.room_name === [currentUser.id, chatWith.userId].sort().join('-')) {
        setMessages(prev => [...prev, msg]);
      }
    };

    chatSocket.on('online-players-update', onPlayersUpdate);
    chatSocket.on('new-message', onNewMessage);

    return () => {
      chatSocket.off('online-players-update', onPlayersUpdate);
      chatSocket.off('new-message', onNewMessage);
    };
  }, [currentUser, chatWith]);

  const sendFriendRequest = async (targetUserId: string) => {
    await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ targetUserId }),
    });
  };

  const openPrivateChat = (player: OnlinePlayer) => {
    if (chatWith) {
      const oldRoom = [currentUser!.id, chatWith.userId].sort().join('-');
      chatSocket.leavePrivateRoom(oldRoom);
    }
    setChatWith(player);
    setMessages([]);
    const conversationId = [currentUser!.id, player.userId].sort().join('-');
    chatSocket.joinPrivateRoom(conversationId, currentUser!.id);
  };

  const closeChat = () => {
    if (chatWith) {
      const room = [currentUser!.id, chatWith.userId].sort().join('-');
      chatSocket.leavePrivateRoom(room);
    }
    setChatWith(null);
  };

  const sendPrivateMessage = () => {
    if (!chatWith || !newMessage.trim() || !currentUser) return;
    const conversationId = [currentUser.id, chatWith.userId].sort().join('-');
    chatSocket.sendPrivateMessage(conversationId, newMessage, currentUser.id);
    setMessages(prev => [...prev, {
      id: 'temp',
      content: newMessage,
      timestamp: Date.now(),
      room_name: conversationId,
      user: currentUser.id
    }]);
    setNewMessage('');
  };

  if (!currentUser) return <div>Loading...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button
        onClick={() => router.back()}
        className="mb-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
      >
        ← Return
      </button>
      <h1 className="text-4xl font-bold mb-8 text-center">
        👥 Online Players ({onlinePlayers.length})
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          {onlinePlayers.map(player => {
            const isFriend = myFriends.includes(player.userId);
            return (
              <div key={player.userId} className="bg-white p-5 rounded-xl shadow flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">{player.tankName || player.username}</p>
                  <p className="text-gray-500">@{player.username}</p>
                </div>
                <div className="flex gap-3">
                  {!isFriend ? (
                    <button
                      onClick={() => sendFriendRequest(player.userId)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                    >
                      Ajouter
                    </button>
                  ) : (
                    <button
                      onClick={() => openPrivateChat(player)}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
                    >
                      💬 Chat
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {chatWith && (
          <div className="bg-gray-900 text-white p-6 rounded-2xl h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Chat with {chatWith.tankName || chatWith.username}</h2>
              <button onClick={closeChat} className="text-red-400">Close</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg max-w-[80%] ${
                    msg.user === currentUser.id ? 'bg-blue-600 ml-auto' : 'bg-gray-700'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendPrivateMessage()}
                placeholder="Type your message..."
                className="flex-1 bg-gray-800 text-white p-4 rounded-lg"
              />
              <button onClick={sendPrivateMessage} className="bg-green-600 px-8 rounded-lg">
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
