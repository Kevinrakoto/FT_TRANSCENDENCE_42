const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const lobbies = {
	2: [],
	3: [],
	4: []
};

const players = new Map();

module.exports = (io) => {
    const gameNamespace = io.of('/tank-game');

    gameNamespace.on('connection', (socket) => {

		const username = socket.handshake.auth.username;

		const gameMode = parseInt(socket.handshake.auth.gameMode || 2);

		socket.data.username = username;

		lobbies[gameMode].push(socket);

        socket.on('disconnect', () => {
            const index = lobbies[gameMode].indexOf(socket);
            if (index !== -1) {
                lobbies[gameMode].splice(index, 1);
            }
        });

        if (lobbies[gameMode].length >= gameMode) {
            const matchPlayers = lobbies[gameMode].splice(0, gameMode);
			const playerNames = matchPlayers.map(p => p.data.username);
            const mapNames = ['one', 'two', 'three'];
            const randomMap = mapNames[Math.floor(Math.random() * mapNames.length)];
            console.log("Starting match on map:", randomMap);

			matchPlayers.forEach(p => {
				p.data.score = 0;
			});

            matchPlayers.forEach((playerSocket, index) => {
                const playerNumber = index + 1;
               
				const initialLeaderboard = matchPlayers.map( p => ({
					playerNumber: matchPlayers.indexOf(p) + 1,
					username: p.data.username,
					score: 0
				}));

                playerSocket.emit('gameStart', {
                    map: randomMap,
                    myPlayerNumber: playerNumber,
					playerNames: playerNames,
                    numberOfPlayer: gameMode
                });
				playerSocket.emit('leaderboardUpdate', initialLeaderboard);
                playerSocket.on('move', (data) => {
                    matchPlayers.forEach((other) => {
                        if (other.id !== playerSocket.id) {
                            other.emit('playerMoved', {
                                playerNumber: playerNumber,
                                x: data.x,
                                z: data.z,
                                rotation: data.rotation
                            });
                        }
                    });
                });
				playerSocket.on('hitBlock', (data) => {
					matchPlayers.forEach((other) => {
						if (other.id !== playerSocket.id) {
							other.emit('blockHit', {
								x: data.x,
								y: data.y
							});
						}
					});
				});
				playerSocket.on('hitPlayer', (data) => {
					matchPlayers.forEach((other) => {
						if (other.id !== playerSocket.id) {
							other.emit('playerShot', {
								playerNumber: data.playerNumber,
								shooter: data.shooter
							});
						}
					});
				});
				playerSocket.on('shoot', (data) => {
					matchPlayers.forEach((other) => {
						if (other.id !== playerSocket.id) {
							other.emit('bulletShot', {
								playerNumber: playerNumber,
								x: data.x,
								y: data.y,
								z: data.z,
								dir: data.dir,
								owner: data.owner
							});
						}
					});
				});
				playerSocket.on('removeBullet', (data) => {
					matchPlayers.forEach((other) => {
						if (other.id !== playerSocket.id) {
							other.emit('bulletRemoved', {
								playerNumber: playerNumber,
								i: data.i
							});
						}
					});
				});
				playerSocket.on('playerDied', (data) => {
					const playerSocket = matchPlayers[data.number - 1];
					playerSocket.data.score += 1;
					console.log(playerSocket.data.username, "score:", playerSocket.data.score);
					const leaderboard = matchPlayers.map( p => ({
						playerNumber: matchPlayers.indexOf(p) + 1,
						username: p.data.username,
						score: p.data.score
					}));

					matchPlayers.forEach( p => {
						p.emit('leaderboardUpdate', leaderboard);
					});

				});
				playerSocket.on('reload', () => {
					matchPlayers.forEach((other) => {
						if (other.id !== playerSocket.id) {
							other.emit('playerReloading', {
								playerNumber: playerNumber
							});
						}
					});
				});
			});

			let timer = 300;

			const matchTimer = setInterval(() => {
				--timer;
				matchPlayers.forEach((playerSocket) => {
					playerSocket.emit('timeUpdate', { seconds: timer });
				});

				if (timer <= 0) {
					clearInterval(matchTimer);
					const leaderboard = matchPlayers.map( p => ({
						playerNumber: matchPlayers.indexOf(p) + 1,
						username: p.data.username,
						score: p.data.score
					}));
					matchPlayers.forEach((playerSocket) => {
						playerSocket.emit('gameOver', leaderboard);
					});
				}
			}, 1000);
		}
        else {
            socket.emit('waiting', {
				current: lobbies[gameMode].length,
				required: gameMode
			});
        }
    });
};
