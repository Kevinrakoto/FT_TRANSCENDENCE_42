const lobby = [];
const MAX_PLAYER = 2;

module.exports = (io) => {
    const gameNamespace = io.of('/tank-game');

    gameNamespace.on('connection', (socket) => {
        console.log('Player joined lobbyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy:', socket.id);
        lobby.push(socket);

        socket.on('disconnect', () => {
            const index = lobby.indexOf(socket);
            if (index !== -1) {
                lobby.splice(index, 1);
            }
        });

        if (lobby.length >= MAX_PLAYER) {
            const matchPlayers = lobby.splice(0, MAX_PLAYER);
            const mapNames = ['one', 'two', 'three'];
            const randomMap = mapNames[Math.floor(Math.random() * mapNames.length)];
            console.log("Starting match on map:", randomMap);

            matchPlayers.forEach((playerSocket, index) => {
                const playerNumber = index + 1;
                
                playerSocket.emit('gameStart', {
                    map: randomMap,
                    myPlayerNumber: playerNumber,
                    numberOfPlayer: MAX_PLAYER
                });
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
								playerNumber: data.playerNumber
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
								dir: data.dir
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
			});
		}
        else {
            socket.emit('waiting', {current: lobby.length, required: MAX_PLAYER});
        }
    });
};
