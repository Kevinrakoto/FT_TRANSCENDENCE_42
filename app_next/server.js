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
  console.log(`\n=== 👥 Joueurs connectés [${context}] ===`);
  if (onlinePlayers.size === 0) {
    console.log('Aucun joueur connecté');
  } else {
    console.log(`Total: ${onlinePlayers.size} joueur(s)`);
    onlinePlayers.forEach((player, userId) => {
      console.log(`  • ID: (${userId}) - Socket: ${player.socketId} - Tank: ${player.tankName || 'Aucun'}`);
    });
  }
  console.log('=====================================\n');
}

app.prepare().then(() => {
  const server = createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: '*', // À sécuriser en prod (ex: domaine + localhost)
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    
    // --------------------------------------------------------------------
    // GESTION DES JOUEURS CONNECTÉS (pour la liste online + demandes d'ami)
    // --------------------------------------------------------------------
    
    socket.on('join-game', (userData) => {
  if (!userData || !userData.userId) {
    console.warn('Tentative de join-game sans userId/username', userData.userId);
    return;
  }
  
  console.log('Nouvelles connexion Socket.IO →', socket.id);
  
  const existingPlayer = onlinePlayers.get(userData.userId);
  
  if (existingPlayer) {
    if (existingPlayer.socketId === socket.id) {
      console.log(`🔄 Reconnexion du même socket pour ${userData.userId}`);
      onlinePlayers.set(userData.userId, {
        ...existingPlayer,
        ...userData,
        socketId: socket.id
      });
    } else {
      console.log(`⚠️  Conflit: ${userData.userId} déjà connecté avec un autre socket`);
      socket.emit('dbl_connex', { message: 'Ce compte est déjà connecté ailleurs.' });
      socket.disconnect(true);
      return;
    }
  } else {
    onlinePlayers.set(userData.userId, {
      userId: userData.userId,
      username: userData.username,
      tankName: userData.tankName || null,
      socketId: socket.id,
    });
  }

  prisma.user.update({
    where: { id: Number(userData.userId) },
    data: { isOnline: true }
  }).catch(err => console.error('Error updating online status:', err));

  console.log(`Joueur connecté: ${userData.userId} (${userData.userId})`);
  io.emit('online-players-update', Array.from(onlinePlayers.values()));
  io.emit('user-joined', { userId: Number(userData.userId) });
});

    // --------------------------------------------------------------------
    // DEMANDER LA LISTE DES JOUEURS EN LIGNE
    // --------------------------------------------------------------------
    
    socket.on('request-online-players', () => {
      socket.emit('online-players-update', Array.from(onlinePlayers.values()));
    });

    // --------------------------------------------------------------------
    // CHAT PRIVÉ
    // --------------------------------------------------------------------
    
    socket.on('join-private-room', async (data) => {
    if (!data?.conversationId || !data?.userId) return;

    socket.join(String(data.conversationId));
    console.log(`Socket ${socket.id} a rejoint la room ${data.conversationId}`);
    
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

    // --------------------------------------------------------------------
    // ENVOI DE MESSAGE PRIVÉ
    // --------------------------------------------------------------------
    
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
              select: { id: true, username: true, tankName: true }
            }
          }
        });
        
        io.to(String(data.conversationId)).emit('new-message', message);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });

    // --------------------------------------------------------------------
    // QUITTER UNE ROOM PRIVÉE
    // --------------------------------------------------------------------
    
    socket.on('leave-private-room', (data) => {
      if (!data?.conversationId) return;
      socket.leave(String(data.conversationId));
      console.log(`Socket ${socket.id} left room ${data.conversationId}`);
    });

    // --------------------------------------------------------------------
    // INDICATEUR DE FRAPE
    // --------------------------------------------------------------------
    
    socket.on('typing', (data) => {
      if (!data?.conversationId) return;
      socket.to(String(data.conversationId)).emit('user-typing', {
        userId: data.userId,
        isTyping: data.isTyping
      });
    });

    // --------------------------------------------------------------------
    // MISE À JOUR PROFIL/AVATAR EN TEMPS RÉEL
    // --------------------------------------------------------------------
    
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

    // --------------------------------------------------------------------
    // MARQUER LES MESSAGES COMME LU
    // --------------------------------------------------------------------
    
    socket.on('mark-messages-read', async (data) => {
      if (!data?.conversationId || !data?.messageIds || !data?.userId) return;
      
      try {
        for (const messageId of data.messageIds) {
          await prisma.messageRead.upsert({
            where: {
              messageId_userId: {
                messageId: parseInt(messageId),
                userId: data.userId
              }
            },
            update: { readAt: new Date() },
            create: {
              messageId: parseInt(messageId),
              userId: data.userId
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

    // --------------------------------------------------------------------
    // DÉCONNEXION → nettoyage
    // --------------------------------------------------------------------
    socket.on('player-disconnect', async (data) => {
      if (data?.userId) {
        onlinePlayers.delete(data.userId)
        io.emit('online-players-update', Array.from(onlinePlayers.values()))
        io.emit('user-left', { userId: Number(data.userId) })
        
        await prisma.user.update({
          where: { id: Number(data.userId) },
          data: { isOnline: false, lastSeen: new Date() }
        }).catch(err => console.error('Error updating offline status:', err));
        
        console.log(`Joueur déconnecté manuellement: ${data.userId}`)
      }
    })

    socket.on('disconnect', async () => {
        console.log('Client déconnecté →', socket.id);

        let disconnectedUserId = null;

        for (const [userId, player] of onlinePlayers.entries()) {
          if (player.socketId === socket.id ) {
            onlinePlayers.delete(userId);
            disconnectedUserId = userId;
            break;
          }
        }

        if (disconnectedUserId) {
          console.log(`Joueur déconnecté: ${disconnectedUserId}`);
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
    console.error('Erreur démarrage serveur:', error);
  } else {
    console.log('> Server ready on https://localhost:3000');
  }
  });

});