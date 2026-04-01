
const lobbies = {
	2: [],
	3: [],
	4: []
};

const players = new Map();

module.exports = (io) => {
    const gameNamespace = io.of('/tank-game');

    gameNamespace.on('connection', (socket) => {

		const userId = socket.handshake.auth.userId;
		const username = socket.handshake.auth.username;
		const tankColor = socket.handshake.auth.tankColor;
		const gameMode = parseInt(socket.handshake.auth.gameMode || 2);

		socket.data.userId = userId;
		socket.data.username = username;
		socket.data.tankColor = tankColor;

		lobbies[gameMode].push(socket);

        socket.on('disconnect', () => {
            const index = lobbies[gameMode].indexOf(socket);
            if (index !== -1) {
                lobbies[gameMode].splice(index, 1);
            }
        });

        if (lobbies[gameMode].length >= gameMode) {
			const originalMatchPlayers = lobbies[gameMode].splice(0, gameMode);
            let matchPlayers = [...originalMatchPlayers];
			let matchEnded = false;

			let activePowerup = true;
			let powerupTimer = null;

			function startPowerupTimer() {
				if (powerupTimer) clearTimeout(powerupTimer);
				powerupTimer = setTimeout(() => {
					if (matchEnded) return;
					activePowerup = true;
					matchPlayers.forEach(p => p.emit('spawnPowerup'));
				}, 20000);
			}
			const playerNames = originalMatchPlayers.map(p => p.data.username);
			const playerColors = originalMatchPlayers.map(p => p.data.tankColor);
            const mapNames = ['one', 'two', 'three'];
            const randomMap = mapNames[Math.floor(Math.random() * mapNames.length)];


			originalMatchPlayers.forEach(p => {
				p.data.score = 0;
			});

            originalMatchPlayers.forEach((playerSocket, index) => {
                const playerNumber = index + 1;
               
				const initialLeaderboard = originalMatchPlayers.map( p => ({
					playerNumber: originalMatchPlayers.indexOf(p) + 1,
					username: p.data.username,
					score: 0
				}));

				playerSocket.on('disconnect', () => {
					matchPlayers = matchPlayers.filter(p => p.id !== playerSocket.id);

					if (matchEnded) return;

					const leaderboard = matchPlayers.map( p => ({
						playerNumber: originalMatchPlayers.indexOf(p) + 1,
						userId: p.data.userId,
						username: p.data.username,
						score: p.data.score
					}));

					matchPlayers.forEach( (other) => {
						other.emit('playerDisconnected', {
							playerNumber: playerNumber
						});
						other.emit('leaderboardUpdate', leaderboard);
					});

					if (matchPlayers.length <= 1) {
						matchEnded = true;
						if (matchPlayers.length === 1) {
							matchPlayers[0].emit('gameOver', {
								leaderboard: leaderboard
							});
						}
					}
				});
                playerSocket.emit('gameStart', {
                    map: randomMap,
                    myPlayerNumber: playerNumber,
					playerNames: playerNames,
					playerColors: playerColors,
                    numberOfPlayer: gameMode
                });
				playerSocket.emit('spawnPowerup');
				playerSocket.emit('leaderboardUpdate', initialLeaderboard);
                playerSocket.on('move', (data) => {
					if (activePowerup && Math.abs(data.x) < 0.8 && Math.abs(data.z) < 0.8) {
						let randomSeed = Math.random();
						activePowerup = false;
						matchPlayers.forEach(other => {
							other.emit('collectPowerup', {
								playerNumber: playerNumber,
								seed: randomSeed
							});
						});
						startPowerupTimer();
					}
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
					if (matchEnded) return;
					const playerSocket = originalMatchPlayers[data.number - 1];
					playerSocket.data.score += 1;
				const leaderboard = matchPlayers.map( p => ({
						playerNumber: matchPlayers.indexOf(p) + 1,
						userId: p.data.userId,
						username: p.data.username,
						score: p.data.score
					}));

					matchPlayers.forEach( p => {
						p.emit('leaderboardUpdate', leaderboard);
					});

					if (playerSocket.data.score >= 5) {
						matchEnded = true;
						matchPlayers.forEach( p => {
							p.emit('gameOver', {
								leaderboard: matchPlayers.map( mp => ({
									playerNumber: originalMatchPlayers.indexOf(mp) + 1,
									userId: mp.data.userId,
									username: mp.data.username,
									score: mp.data.score
								}))
							});
						});
					}
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
		} else {
            socket.emit('waiting', {
				current: lobbies[gameMode].length,
				required: gameMode
			});
    	}
    });
};
