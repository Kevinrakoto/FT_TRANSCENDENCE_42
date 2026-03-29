const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const initTankGame = require('./tankServer');

const httpsOptions = {
  key: fs.readFileSync('/app/certificates/private-key.pem'),
  cert: fs.readFileSync('/app/certificates/cert.pem'),
};

const onlinePlayers = new Map();

function logOnlinePlayers(context) {
  if (onlinePlayers.size === 0) {
  } else {
    onlinePlayers.forEach((player, userId) => {
    });
  }
}

app.prepare().then(() => {
  const server = createServer(httpsOptions, (req, res) => {
    // Internal endpoint for API routes to emit Socket.IO events
    if (req.method === 'POST' && req.url === '/api/emit-friend-notification') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { targetUserId, event, data } = JSON.parse(body);
          if (targetUserId && event) {
            const targetPlayer = onlinePlayers.get(String(targetUserId));
            if (targetPlayer) {
              io.to(targetPlayer.socketId).emit(event, data);
            }
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed' }));
        }
      });
      return;
    }

    // Internal endpoint to force-disconnect an old session
    if (req.method === 'POST' && req.url === '/api/force-logout') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { userId } = JSON.parse(body);
          if (userId) {
            const existingPlayer = onlinePlayers.get(String(userId));
            if (existingPlayer) {
              // Find the socket and force disconnect it
              const oldSocket = io.sockets.sockets.get(existingPlayer.socketId);
              if (oldSocket) {
                oldSocket.emit('force-logout', { reason: 'Another session opened for this account' });
                oldSocket.disconnect(true);
              }
              onlinePlayers.delete(String(userId));
              io.emit('online-players-update', Array.from(onlinePlayers.values()));
              io.emit('user-left', { userId: Number(userId) });
            }
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed' }));
        }
      });
      return;
    }

    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    
    socket.on('join-game', (userData) => {
  if (!userData || !userData.userId) {
    return;
  }
  
  const existingPlayer = onlinePlayers.get(userData.userId);
  
  if (existingPlayer) {
    if (existingPlayer.socketId === socket.id) {
      // Same socket reconnecting (e.g. page refresh)
      onlinePlayers.set(userData.userId, {
        ...existingPlayer,
        ...userData,
        socketId: socket.id
      });
    } else {
      // Different socket = new session for same user
      // Disconnect the OLD socket, accept the NEW one
      const oldSocket = io.sockets.sockets.get(existingPlayer.socketId);
      if (oldSocket) {
        oldSocket.emit('force-logout', { reason: 'Another session opened for this account' });
        oldSocket.disconnect(true);
      }
      // Now register the new socket
      onlinePlayers.set(userData.userId, {
        userId: userData.userId,
        username: userData.username,
        socketId: socket.id,
      });
    }
  } else {
    onlinePlayers.set(userData.userId, {
      userId: userData.userId,
      username: userData.username,
      socketId: socket.id,
    });
  }

  prisma.user.update({
    where: { id: Number(userData.userId) },
    data: { isOnline: true }
  }).catch(err => console.error('Error updating online status:', err));

  io.emit('online-players-update', Array.from(onlinePlayers.values()));
  io.emit('user-joined', { userId: Number(userData.userId) });
});
 
    socket.on('request-online-players', () => {
      socket.emit('online-players-update', Array.from(onlinePlayers.values()));
    });

    // --------------------------------------------------------------------
    // PRIVATE chAT
    // --------------------------------------------------------------------
    
    socket.on('join-private-room', async (data) => {
    if (!data?.conversationId || !data?.userId) return;

    socket.join(String(data.conversationId));
    
    socket.emit('online-players-update', Array.from(onlinePlayers.values()));
    
    const roomKey = String(data.conversationId);
    const roomSockets = await io.in(roomKey).fetchSockets();
    
    const otherUserIds = []
    for (const s of roomSockets) {
      if (s.id !== socket.id) {
        for (const [userId, player] of onlinePlayers) {
          if (player.socketId === s.id) {
            otherUserIds.push(Number(userId))
            break
          }
        }
      }
    }
    
    socket.emit('room-participants', otherUserIds)
    socket.to(roomKey).emit('user-joined', { userId: Number(data.userId) })
    
    for (const otherUserId of otherUserIds) {
      socket.emit('user-joined', { userId: otherUserId })
    }
});
    socket.on('private-message', async (data) => {
      if (!data?.conversationId || !data?.content || !data?.userId) return;
      
      try {
        const message = await prisma.message.create({
          data: {
            content: data.content,
            conversationId: parseInt(data.conversationId),
            userId: parseInt(data.userId),
          },
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        });
        
        io.to(String(data.conversationId)).emit('new-message', message);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });
    socket.on('leave-private-room', (data) => {
      if (!data?.conversationId) return;
      socket.leave(String(data.conversationId));
    });
    socket.on('typing', (data) => {
      if (!data?.conversationId) return;
      socket.to(String(data.conversationId)).emit('user-typing', {
        userId: data.userId,
        isTyping: data.isTyping
      });
    });
    socket.on('profile-update', async (data) => {
      if (!data?.userId || !data?.updates) return;
      
      try {
        await prisma.user.update({
          where: { id: data.userId },
          data: data.updates
        });
        
        io.emit('user-profile-updated', {
          userId: data.userId,
          ...data.updates
        });
      } catch (error) {
        console.error('Error updating profile:', error);
      }
    });
    socket.on('mark-messages-read', async (data) => {
      if (!data?.conversationId || !data?.messageIds || !data?.userId) return;
      
      try {
        const userIdInt = parseInt(data.userId);
        for (const messageId of data.messageIds) {
          await prisma.messageRead.upsert({
            where: {
              messageId_userId: {
                messageId: parseInt(messageId),
                userId: userIdInt
              }
            },
            update: { readAt: new Date() },
            create: {
              messageId: parseInt(messageId),
              userId: userIdInt
            }
          });
        }
        socket.to(String(data.conversationId)).emit('messages-read', {
          messageIds: data.messageIds,
          userId: data.userId
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });
    socket.on('player-disconnect', async (data) => {
      if (data?.userId) {
        onlinePlayers.delete(data.userId)
        io.emit('online-players-update', Array.from(onlinePlayers.values()))
        io.emit('user-left', { userId: Number(data.userId) })
        
        await prisma.user.update({
          where: { id: Number(data.userId) },
          data: { isOnline: false, lastSeen: new Date() }
        }).catch(err => console.error('Error updating offline status:', err));
        
      }
    })

    socket.on('disconnect', async () => {

        let disconnectedUserId = null;

        for (const [userId, player] of onlinePlayers.entries()) {
          if (player.socketId === socket.id ) {
            onlinePlayers.delete(userId);
            disconnectedUserId = userId;
            break;
          }
        }

        if (disconnectedUserId) {
          io.emit('online-players-update', Array.from(onlinePlayers.values()));
          io.emit('user-left', { userId: Number(disconnectedUserId) });
          
          await prisma.user.update({
            where: { id: Number(disconnectedUserId) },
            data: { isOnline: false, lastSeen: new Date() }
          }).catch(err => console.error('Error updating offline status:', err));
        }
    })
  });

  // --------------------------------------------------------------------------
  
  initTankGame(io);

  // --------------------------------------------------------------------------
  server.listen(3000, (error) => {
  if (error) {
    console.error('Server startup error:', error);
  } else {
  }
  });

});