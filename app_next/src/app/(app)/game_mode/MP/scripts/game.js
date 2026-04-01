
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { io } from 'socket.io-client';

export function launchGame(container, callbacks, userData, gameMode) {
	let isMounted = true;
	let socket = null;
	let myPlayerNumber = null;
	let numberOfPlayer = 2;
	let remotePlayers = {};
	let isGameRunning = false;
	let powerupMesh = null;

	const scene = new THREE.Scene();

	const camera = new THREE.PerspectiveCamera( 32, window.innerWidth / window.innerHeight, 0.1, 1000 );
	camera.position.y = 46;
	camera.position.z = 26;
	camera.lookAt( 0, 0, 2.5 );

	const renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	container.appendChild( renderer.domElement );

	const ambient = new THREE.AmbientLight( {color: 0xffffff} );
	scene.add(ambient);

	const light = new THREE.DirectionalLight( {color: 0xffffff}, 5 );
	light.position.y = 100;
	scene.add(light);

	const textureloader = new THREE.TextureLoader();
	const manager = new THREE.LoadingManager();
	const loader = new GLTFLoader(manager);
	let loaded = false;
	const clock = new THREE.Clock();
	const bullets = [];
	const input = {};
	let lastPressed = null;
	let bulldir = 's';
	let spaceReleased = true;

	const onResize = () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( window.innerWidth, window.innerHeight );
	};
	window.addEventListener('resize', onResize);

	const onKeyDown = (i) => {
		const k = i.key.toLowerCase();
		if (!input[k]) {
			input[k] = Date.now();
		}
	};

	const onKeyUp = (i) => {
		const k = i.key.toLowerCase();
		delete input[k];
		if (k === ' ') {
			spaceReleased = true;
		}
	};

	const onBlur = () => {
		for (const k in input) {
			delete input[k];
		}
	};

	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
	window.addEventListener('blur', onBlur);

	const models = {};

	let player;

	const maps = {
		one:
		[[5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
		 [5,-1, 0, 0, 0, 0, 0, 0, 1, 9, 9, 0, 0,-2, 5],
		 [5, 0, 7, 0, 0, 0, 0, 0, 2, 0, 9, 0, 0, 0, 5],
		 [5, 0, 0, 0, 8, 8, 0, 0, 1, 9, 9, 0, 8, 0, 5],
		 [5, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5],
		 [5, 0, 0, 0, 1, 2, 1, 0, 0, 3, 3, 3, 3, 3, 5],
		 [5, 1, 0, 0, 9, 0, 9, 0, 0, 3, 0, 0, 0, 0, 5],
		 [5, 0, 0, 0, 9, 0, 9, 0, 0, 3, 0, 1, 1, 0, 5],
		 [5, 3, 3, 0, 9, 2, 9, 0, 0, 3, 0, 0, 1, 0, 5],
		 [5, 0, 3, 0, 0, 0, 0, 0, 7, 3, 0, 0, 0, 0, 5],
		 [5, 0, 3, 3, 3, 3, 0, 0, 0, 0, 0, 7, 0, 8, 5],
		 [5, 0, 0, 0, 0, 0, 0, 8, 8, 0, 0, 0, 0, 1, 5],
		 [5, 0, 8, 0, 0, 9, 0, 0, 0, 0, 1, 0, 0, 0, 5],
		 [5,-3, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0,-4, 5],
		 [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]],

		two:
		[[4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
		 [4,-1, 0, 0, 0, 0, 0, 10,1, 0, 0, 0, 0,-2, 4],
		 [4, 0, 0, 7, 0, 0, 0, 10,0, 9, 9, 9, 0, 0, 4],
		 [4, 0, 0, 0, 0, 0, 0, 0 ,0, 9, 0, 9, 0, 0, 4],
		 [4, 0, 8, 0, 0, 8, 0, 10,0, 2, 0, 2, 0, 0, 4],
		 [4, 0, 0, 0, 0, 0, 0, 10,0, 9, 0, 9, 0, 0, 4],
		 [4, 1, 2, 1, 0, 0, 0, 10,0, 9, 9, 9, 0, 0, 4],
		 [4, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 4],
		 [4, 0, 0, 0, 0, 0, 0, 10,0, 7, 0, 0, 0, 0, 4],
		 [4, 0, 8, 0, 0, 8, 0, 10,0, 0, 0, 7, 0, 0, 4],
		 [4, 0, 0, 0, 0, 0, 0, 10,0, 0, 1, 1, 1, 0, 4],
		 [4, 0, 7, 0, 0, 7, 0, 0 ,0, 0, 0, 0, 0, 0, 4],
		 [4, 0, 0, 0, 0, 0, 0, 10,0, 8, 0, 8, 0, 0, 4],
		 [4,-3, 0, 0, 0, 0, 0, 10,1, 0, 0, 0, 0,-4, 4],
		 [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]],

		three:
		[[6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
		 [6,-1, 0, 0, 0, 0, 0, 1, 0, 8, 0, 0, 0,-2, 6],
		 [6, 0, 0, 8, 8, 0, 0, 3, 3, 3, 0, 0, 0, 0, 6],
		 [6, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 6],
		 [6, 0, 0, 0, 1, 0, 0, 9, 9, 0, 0, 0, 0, 7, 6],
		 [6, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 7, 0, 6],
		 [6, 8, 0, 0, 0, 7, 0, 2, 0, 0, 0, 0, 0, 0, 6],
		 [6, 1, 0, 9, 9, 0, 0, 0, 0, 0, 8, 8, 0, 1, 6],
		 [6, 0, 0, 2, 0, 0, 0, 0, 7, 0, 0, 0, 0, 8, 6],
		 [6, 0, 0, 9, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
		 [6, 7, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 6],
		 [6, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 6],
		 [6, 0, 0, 0, 0, 3, 3, 3, 0, 0, 8, 8, 0, 0, 6],
		 [6,-3, 0, 0, 0, 8, 0, 1, 0, 0, 0, 0, 0,-4, 6],
		 [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6]],
	};

	let map;
	let blockSize = 1;
	const blocks = [];

	loader.load('/tank-game/gltf/Tank.glb', (g) => { models.tank = g.scene; });
	loader.load('/tank-game/gltf/glass.gltf', (g) => { models.glass = g.scene; });
	loader.load('/tank-game/gltf/metal.gltf', (g) => { models.metal = g.scene; });
	loader.load('/tank-game/gltf/water.gltf', (g) => { models.water = g.scene; });
	loader.load('/tank-game/gltf/wood.gltf', (g) => { models.wood = g.scene; });
	loader.load('/tank-game/gltf/dirt.gltf', (g) => { models.dirt = g.scene; });
	loader.load('/tank-game/gltf/bricks_B.gltf', (g) => { models.bricks = g.scene; });
	loader.load('/tank-game/gltf/lava.gltf', (g) => { models.lava = g.scene; });
	loader.load('/tank-game/gltf/colored_block_green.gltf', (g) => { models.green = g.scene; });
	loader.load('/tank-game/gltf/colored_block_blue.gltf', (g) => { models.blue = g.scene; });
	loader.load('/tank-game/gltf/colored_block_yellow.gltf', (g) => { models.yellow = g.scene; });

	manager.onLoad = () => {
		if (!isMounted) return;

		const box = new THREE.Box3().setFromObject(models.glass);
		const size = new THREE.Vector3();
		box.getSize(size);
		blockSize = size.x;

		if (!socket) {
			socket = io('/tank-game', {
				transports: ['websocket'],
				path: '/socket.io',
				rejectUnauthorized: false,
				autoConnect: false,
				reconnection: false,
				auth: {
					userId: userData.id,
					username: userData.username,
					tankColor: userData.tankColor,
					gameMode: gameMode
				},
			});
			socket.connect();
			setupSocketListener();
		}
	};

	const groundtexture = textureloader.load('/tank-game/textures/ground.jpg');
	groundtexture.colorSpace = THREE.SRGBColorSpace;
	groundtexture.minFilter = THREE.NearestFilter;
	groundtexture.wrapS = THREE.RepeatWrapping;
	groundtexture.wrapT = THREE.RepeatWrapping;
	groundtexture.repeat.set(10, 10);
	const groundgeometry = new THREE.BoxGeometry(100, blockSize, 100);
	const groundmaterial = new THREE.MeshStandardMaterial({map: groundtexture});
	const ground = new THREE.Mesh(groundgeometry, groundmaterial);
	ground.position.y = - blockSize * 1.6;

	scene.add(ground);

	function animate() {
		const delta = clock.getDelta();

		if (loaded === false) {
			if (isGameRunning === false) {
				renderer.render( scene, camera );
			}
			return;
		}

		const directions = ['w', 'a', 's', 'd'];
		let newestTime = 0;
		let activeDir = null;

		directions.forEach((d) => {
			if (input[d] && input[d] > newestTime) {
				newestTime = input[d];
				activeDir = d;
			}
		});

		lastPressed = activeDir;
		if (lastPressed) bulldir = lastPressed;

		if (input['r'] && player.userData.ammo < player.userData.maxAmmo
			&& player.userData.isReloading === false && player.userData.dead === false) {
			socket.emit('reload');
			startReload(player);
		}

		if (input[' '] && spaceReleased && player.userData.ammo > 0
			&& player.userData.isReloading === false && player.userData.dead === false) {
			spaceReleased = false;
			player.userData.ammo -= 1;

			const ammoBar = player.getObjectByName('ammoBar');
			if (ammoBar) {
				updateAmmoBar(ammoBar, player.userData.ammo, player.userData.maxAmmo, 0);
			}

			const geo = new THREE.SphereGeometry(0.17, 6, 6);
			const mat = new THREE.MeshBasicMaterial({color: 0xffffff});
			const bullet = new THREE.Mesh(geo, mat);

			bullet.position.copy(player.position);
			bullet.position.y += 0.8;
			bullet.userData.dir = bulldir;
			bullet.userData.owner = myPlayerNumber;
			scene.add(bullet);
			bullets.push(bullet);

			socket.emit('shoot', {
				x: bullet.position.x,
				y: bullet.position.y,
				z: bullet.position.z,
				dir: bullet.userData.dir,
				owner: myPlayerNumber
			});

			if (player.userData.ammo <= 0) {
				socket.emit('reload');
				startReload(player);
			}
		}

		if (lastPressed && player.userData.dead === false) {

			const X = player.position.x;
			const Z = player.position.z;

			if (lastPressed === 'w') player.rotation.y = Math.PI;
			if (lastPressed === 's') player.rotation.y = 0;
			if (lastPressed === 'd') player.rotation.y = Math.PI / 2;
			if (lastPressed === 'a') player.rotation.y = -Math.PI / 2;

			let speed  = player.userData.speed * delta;

			if (lastPressed === 'a') player.position.x -= speed;
			if (lastPressed === 'd') player.position.x += speed;
			if (lastPressed === 'w') player.position.z -= speed;
			if (lastPressed === 's') player.position.z += speed;

			if (checkCollision(player)) {
				player.position.x = X;
				player.position.z = Z;
			}

			socket.emit('move', {
				x: player.position.x,
				z: player.position.z,
				rotation: player.rotation.y
			});
		}

		let bSpeed = 30 * delta;

		for (let i = bullets.length - 1; i >= 0; --i) {
			const bullet = bullets[i];
			if (bullet.userData.dir === 'w') bullet.position.z -= bSpeed;
			if (bullet.userData.dir === 's') bullet.position.z += bSpeed;
			if (bullet.userData.dir === 'a') bullet.position.x -= bSpeed;
			if (bullet.userData.dir === 'd') bullet.position.x += bSpeed;

			const bulletBox = new THREE.Box3().setFromObject(bullet);
			let hit = false;

			for (let y = 0; y < blocks.length; ++y) {
				for (let x = 0; x < blocks[y].length; ++x) {
					const block = blocks[y][x];
					if (block && bulletBox.intersectsBox(new THREE.Box3().setFromObject(block))) {
						hit = true;
						socket.emit('hitBlock', {
							x: x,
							y: y
						});
						hitBlock(x, y);
						break ;
					}
				}
				if (hit) break ;
			}
			for (let playerNumber in remotePlayers) {
				const enemy = remotePlayers[playerNumber];
				const enemyBox = new THREE.Box3().setFromObject(enemy);
				if (enemy.userData.dead === false
					&& bulletBox.intersectsBox(enemyBox)) {
					hit = true;
					socket.emit('hitPlayer', {
						playerNumber: playerNumber,
						shooter: bullet.userData.owner
					});
					hitPlayer(playerNumber, bullet.userData.owner);
					break ;
				}
			}
			if (hit) {
				scene.remove(bullet);
				bullets.splice(i, 1);
				socket.emit('removeBullet', {
					i: i,
				});
			}
		}

		for (let key in remotePlayers) {
			remotePlayers[key].userData.bullets.forEach(bullet => {
				if (bullet.userData.dir === 'w') bullet.position.z -= bSpeed;
				if (bullet.userData.dir === 's') bullet.position.z += bSpeed;
				if (bullet.userData.dir === 'a') bullet.position.x -= bSpeed;
				if (bullet.userData.dir === 'd') bullet.position.x += bSpeed;
			});
		}

		if (powerupMesh) {
			powerupMesh.rotation.y += 2 * delta;
			powerupMesh.rotation.x += 2 * delta;
		}

		renderer.render( scene, camera );
	}

	function setupSocketListener() {
		socket.on('gameStart', (data) => {
			myPlayerNumber = data.myPlayerNumber;
			map = maps[data.map];
			numberOfPlayer = data.numberOfPlayer;

			for ( let y = 0; y < map.length; ++y ) {
				blocks[y] = [];
				for (let x = 0; x < map[y].length; ++x) {
					createBlock(map[y][x], x, y);
				}
			}

			if (player) {
				player.traverse((c) => {
					if(c.isMesh) {
						c.material = c.material.clone();
						if (c.material.color.g > c.material.color.r
							&& c.material.color.g > c.material.color.b) {
								c.material.color.set(data.playerColors[myPlayerNumber - 1]);
						}
					}
				});
				const myName = data.playerNames[data.myPlayerNumber - 1];
				const nameLabel = createNameLabel(myName);
				nameLabel.position.y = 3;
				player.add(nameLabel);
			}

			for (let key in remotePlayers) {
				remotePlayers[key].traverse((c) => {
					if(c.isMesh) {
						c.material = c.material.clone();
						if (c.material.color.g > c.material.color.r
							&& c.material.color.g > c.material.color.b) {
								c.material.color.set(data.playerColors[parseInt(key) - 1]);
						}
					}
				});
				const enemyName = data.playerNames[parseInt(key) - 1];
				const nameLabel = createNameLabel(enemyName);
				nameLabel.position.y = 3;
				remotePlayers[key].add(nameLabel);
			}

			isGameRunning = true;
			loaded = true;
			callbacks.onGameStart();
		});

		socket.on('gameOver', (data) => {
			isGameRunning = false;
			callbacks.onGameOver(data);
		});

		socket.on('waiting', (data) => {
		});

		socket.on('playerMoved', (data) => {
			const enemy = remotePlayers[data.playerNumber];
			if (enemy) {
				enemy.position.x = data.x;
				enemy.position.z = data.z;
				enemy.rotation.y = data.rotation;
				if (enemy.userData.dead) {
					enemy.userData.dead = false;
					enemy.userData.health = enemy.userData.maxHealth;
					const healthBar = enemy.getObjectByName('healthBar');
					if (healthBar) {
						updateHealthBar(healthBar, enemy.userData.health,
						enemy.userData.maxHealth);
					}
					enemy.userData.ammo = enemy.userData.maxAmmo;
					const ammoBar = enemy.getObjectByName('ammoBar');
					if (ammoBar) {
						updateAmmoBar(ammoBar, enemy.userData.ammo, enemy.userData.maxAmmo, 0);
					}
				}
			}
		});

		socket.on('blockHit', (data) => {
			hitBlock(data.x, data.y);
		});

		socket.on('bulletShot', (data) => {
			const geo = new THREE.SphereGeometry(0.17, 6, 6);
			const mat = new THREE.MeshBasicMaterial({color: 0xffffff});
			const bullet = new THREE.Mesh(geo, mat);

			bullet.position.set(data.x, data.y, data.z);
			bullet.userData.dir = data.dir;
			bullet.userData.owner = data.owner;
			scene.add(bullet);

			const enemy = remotePlayers[data.playerNumber];
			if (enemy) {
				enemy.userData.bullets.push(bullet);
				enemy.userData.ammo -= 1;

				const ammoBar = enemy.getObjectByName('ammoBar');
				if (ammoBar) {
					updateAmmoBar(ammoBar, enemy.userData.ammo, enemy.userData.maxAmmo, 0);
				}
			}
		});

		socket.on('bulletRemoved', (data) => {
			const remotePlayer = remotePlayers[data.playerNumber];
			if (!remotePlayer) return;
			const bullet = remotePlayers[data.playerNumber].userData.bullets[data.i];
			if (bullet) {
				scene.remove(bullet);
				remotePlayers[data.playerNumber].userData.bullets.splice(data.i, 1);
			}
		});

		socket.on('playerShot', (data) => {
			hitPlayer(data.playerNumber, data.shooter);
		});

		socket.on('leaderboardUpdate', (data) => {
			callbacks.onLeaderboardUpdate(data);
		});

		socket.on('playerReloading', (data) => {
			const enemy = remotePlayers[data.playerNumber];
			if (enemy) {
				startReload(enemy);
			}
		});

		socket.on('playerDisconnected', (data) => {
			const enemy = remotePlayers[data.playerNumber];
			if (enemy) {
				scene.remove(enemy);
				delete remotePlayers[data.playerNumber];
			}
		});

		socket.on('spawnPowerup', () => {
			if (!powerupMesh) {
				const geometry = new THREE.OctahedronGeometry(0.4);
				const material = new THREE.MeshStandardMaterial({color: 0xff69b4});
				powerupMesh = new THREE.Mesh(geometry, material);
				powerupMesh.position.set(0, 0.5, 0);
				scene.add(powerupMesh);
			}
		});

		socket.on('collectPowerup', (data) => {
			if (powerupMesh) {
				scene.remove(powerupMesh);
				powerupMesh = null;
			}

			let thePlayer;
			if (data.playerNumber == myPlayerNumber) thePlayer = player;
			else thePlayer = remotePlayers[data.playerNumber];

			if (thePlayer && thePlayer.userData.dead === false) {
				let validPowerup = [2];

				if (thePlayer.userData.health < thePlayer.userData.maxHealth) {
					validPowerup.push(1);
				}

				if (thePlayer.userData.ammo < thePlayer.userData.maxAmmo && thePlayer.userData.isReloading === false) {
					validPowerup.push(0);
				}

				const randomPowerup = validPowerup[Math.floor(data.seed * validPowerup.length)];

				if (randomPowerup === 0) {
					thePlayer.userData.ammo = thePlayer.userData.maxAmmo;
					const ammoBar = thePlayer.getObjectByName('ammoBar');
					if (ammoBar) {
						updateAmmoBar(ammoBar, thePlayer.userData.ammo, thePlayer.userData.maxAmmo, 0);
					}
				} else if (randomPowerup === 1) {
					thePlayer.userData.health = thePlayer.userData.maxHealth;
					const healthBar = thePlayer.getObjectByName('healthBar')
					if (healthBar) {
						updateHealthBar(healthBar, thePlayer.userData.health,
						thePlayer.userData.maxHealth);
					}
				} else if (randomPowerup === 2) {
					thePlayer.userData.speed += 5;
					const timeout = setTimeout(() => {
						if (thePlayer.userData.dead) return clearTimeout(timeout);
						thePlayer.userData.speed -= 5;
					}, 15000);
				}
			}
		});
	}

	function hitBlock( x, y ) {
		const block = blocks[y][x];
		if (block && block.userData.isDestructible) {
			block.userData.health -= 1;
			block.traverse((child) =>{
				if (child.isMesh) {
					child.material = child.material.clone();
					const originalMap = child.material.map;
					child.material.map = null;
					child.material.color.set(0xffffff);
					child.material.needsUpdate = true;
					setTimeout(() => {
						if (child.material) {
							child.material.map = originalMap;
							child.material.color.setRGB(0.4 ** (block.userData.maxHealth - block.userData.health),
								0.4 ** (block.userData.maxHealth - block.userData.health),
								0.4 ** (block.userData.maxHealth - block.userData.health)
							);
							child.material.needsUpdate = true;
						}
						if (block.userData.health <= 0) {
							scene.remove(block);
							blocks[y][x] = null;
						}
					}, 50);
				}
			});
		}
	}

	function hitPlayer( playerNumber, shooter ) {
		let playerhit;
		if (playerNumber == myPlayerNumber) playerhit = player;
		else playerhit = remotePlayers[playerNumber];

		if (playerhit && playerhit.userData.dead === false) {
			playerhit.userData.health -= 1;
			const healthBar = playerhit.getObjectByName('healthBar');
			if (healthBar) {
				updateHealthBar(healthBar, playerhit.userData.health,
				playerhit.userData.maxHealth);
			}
			playerhit.traverse((child) =>{
				if (child.isMesh && child.name !== 'healthBarSegment') {
					child.material = child.material.clone();
					const originalMap = child.material.map;
					const originalColor = child.material.color.clone();
					child.material.map = null;
					child.material.color.set(0xffffff);
					child.material.needsUpdate = true;
					const interval = setInterval(() => {
						if (child.material) {
							child.material.map = originalMap;
							child.material.color.copy(originalColor);
							child.material.needsUpdate = true;
						}
						if (playerhit.userData.health <= 0) {
							playerhit.userData.dead = true;
							playerhit.position.x = 200;
							if (playerNumber == myPlayerNumber) {
								socket.emit('playerDied', {number: shooter});
								respawn();
							}
						}
					}, 50);
				}
			});
		}
	}

	function respawn() {
		let spawnX = -1, spawnZ = -1;
		let dist = -1;

		for ( let y = 0; y < map.length; ++y ) {
			for ( let x = 0; x < map[y].length; ++x ) {
				if (map[y][x] < 0) {
					const realX = (x * blockSize) + (blockSize / 2) - ((map[y].length * blockSize) / 2);
					const realZ = (y * blockSize) + (blockSize / 2) - ((map.length * blockSize) / 2);
					
					let tempdist = Infinity;
					for ( let playerNumber in remotePlayers ) {
						const enemy = remotePlayers[playerNumber];
						const temp = Math.sqrt((enemy.position.x - realX) ** 2 + (enemy.position.z - realZ) ** 2);

						if (temp < tempdist) {
							tempdist = temp;
						}
					}

					if (tempdist > dist) {
						dist = tempdist;
						spawnX = realX;
						spawnZ = realZ;
					}
				}
			}
		}
		player.userData.dead = false;
		player.userData.health = player.userData.maxHealth;
		player.position.set(spawnX, -0.4, spawnZ);
		const healthBar = player.getObjectByName('healthBar');
		if (healthBar) {
			updateHealthBar(healthBar, player.userData.health,
			player.userData.maxHealth);
		}
		player.userData.ammo = player.userData.maxAmmo;
		const ammoBar = player.getObjectByName('ammoBar');
		if (ammoBar) {
			updateAmmoBar(ammoBar, player.userData.ammo, player.userData.maxAmmo, 0);
		}
		socket.emit('move', {
			x: player.position.x,
			z: player.position.z,
			rotation: player.rotation.y
		});
	}

	function updateHealthBar( sprite, health, maxHealth ) {
		const canvas = sprite.userData.canvas;
		const ctx = sprite.userData.ctx;
		const texture = sprite.userData.texture;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
	
		const padding = 4;
		const gap = 3;
		const totalGaps = maxHealth - 1;
		const barWidth = (canvas.width - (padding * 2) - (gap * totalGaps)) / maxHealth;
		const barHeight = canvas.height - (padding * 2);
		const borderRadius = 8;

		ctx.lineWidth = 2;
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';

		for (let i = 0; i < maxHealth; ++i) {
			const x = padding + i * (barWidth + gap);
			const y = padding;

			ctx.beginPath();
			ctx.roundRect(x, y, barWidth, barHeight, borderRadius);

			if (i < health) {
				ctx.fillStyle = '#780606';
			} else {
				ctx.fillStyle = '#1a1a1a';
			}
			ctx.fill();

			ctx.stroke();
		}

		texture.needsUpdate = true;
	}

	function createHealthBar( maxHealth ) {
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = canvas.width / 4;
		const ctx = canvas.getContext('2d');

		const texture = new THREE.CanvasTexture(canvas);
		const spriteMaterial = new THREE.SpriteMaterial({
			map: texture,
			depthTest: false,
		});

		const sprite = new THREE.Sprite(spriteMaterial);
		sprite.name = 'healthBar';
		sprite.scale.set(1.5, 0.1875, 1);
		sprite.userData = { canvas, ctx, texture };

		updateHealthBar(sprite, maxHealth, maxHealth);

		return (sprite);
	}

	function startReload(player) {
		if (player.userData.isReloading) return;

		player.userData.isReloading = true;

		const reloadTime = 10000;
		const updateInterval = 50;
		let elapsed = 0;

		const reloadInterval = setInterval(() => {
			if (player.userData.dead) {
				clearInterval(reloadInterval);
				player.userData.isReloading = false;
				return ;
			}

			elapsed += updateInterval;
			const progress = Math.min(elapsed / reloadTime, 1);

			const ammoBar = player.getObjectByName('ammoBar');
			if (ammoBar) {
				updateAmmoBar(ammoBar, player.userData.ammo, player.userData.maxAmmo, progress);
			}

			if (elapsed >= reloadTime) {
				clearInterval(reloadInterval);
				player.userData.isReloading = false;
				player.userData.ammo = player.userData.maxAmmo;
				if (ammoBar) {
					updateAmmoBar(ammoBar, player.userData.ammo, player.userData.maxAmmo, 0);
				}
			}
		}, updateInterval);
	}

	function updateAmmoBar( sprite, ammo, maxAmmo, reloadProgress = 0 ) {
		const canvas = sprite.userData.canvas;
		const ctx = sprite.userData.ctx;
		const texture = sprite.userData.texture;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const padding = 4;
		const gap = 1;
		const totalGaps = maxAmmo - 1;
		const barWidth = (canvas.width - (padding * 2) - (gap * totalGaps)) / maxAmmo;
		const barHeight = canvas.height - (padding * 2);
		const borderRadius = 8;

		ctx.lineWidth = 4;
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';

		for (let i = 0; i < maxAmmo; ++i) {
			const x = padding + i * (barWidth + gap);
			const y = padding;

			ctx.beginPath();
			ctx.roundRect(x, y, barWidth, barHeight, borderRadius);

			if (i < ammo) {
				ctx.fillStyle = '#efbf04';
				ctx.fill();
			} else {
				ctx.fillStyle = '#1a1a1a';
				ctx.fill();

				if (reloadProgress > 0) {
					ctx.save();
					ctx.clip();
					const fillHeight = barHeight * reloadProgress;
					ctx.fillStyle = '#fafafa';
					ctx.fillRect(x, y + barHeight - fillHeight, barWidth, fillHeight);
					ctx.restore();
				}
			}

			ctx.stroke();
		}

		texture.needsUpdate = true;
	}

	function createAmmoBar( maxAmmo ) {
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = canvas.width / 4;
		const ctx = canvas.getContext('2d');

		const texture = new THREE.CanvasTexture(canvas);
		const spriteMaterial = new THREE.SpriteMaterial({
			map: texture,
			depthTest: false,
		});

		const sprite = new THREE.Sprite(spriteMaterial);
		sprite.name = 'ammoBar';
		sprite.scale.set(1.5, 0.1875, 1);
		sprite.userData = { canvas, ctx, texture };

		updateAmmoBar(sprite, maxAmmo, maxAmmo, 0);

		return (sprite);
	}

	function createNameLabel( name ) {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		const textWidth = (name.length * 40) + 60;
		canvas.width = Math.max(256, textWidth);
		canvas.height = 128;

		ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
		ctx.beginPath();
		ctx.roundRect(0, 0, canvas.width, canvas.height, 8);
		ctx.fill();
		ctx.font = 'bold 64px Arial';
		ctx.fillStyle = 'white';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(name, canvas.width / 2, canvas.height / 2);

		const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
			map: new THREE.CanvasTexture(canvas),
			depthTest: false,
		}));

		const ratio = canvas.width / canvas.height;
		sprite.scale.set(1 * ratio * 0.5, 0.5, 1);

		return (sprite);
	}

	function createBlock( type, x, y ) {
		let clone;
		const realX = (x * blockSize) + (blockSize / 2) - ((map[y].length * blockSize) / 2);
		const realZ = (y * blockSize) + (blockSize / 2) - ((map.length * blockSize) / 2);
		
		if (type < 0 && Math.abs(type) <= numberOfPlayer) {
			const spawnSlot = Math.abs(type);
			const tank = models.tank.clone();
			tank.position.set(realX, -0.4, realZ);
			tank.scale.set(1.2, 1.2, 1.2);

			const healthBar = createHealthBar(6);
			healthBar.position.y = 2;
			tank.add(healthBar);

			const ammoBar = createAmmoBar(15);
			ammoBar.position.y = 1.6;
			tank.add(ammoBar);

			if (spawnSlot === myPlayerNumber) {
				player = tank;
				player.userData.dead = false;
				player.userData.speed = 7;
				player.userData.health = 6;
				player.userData.maxHealth = 6;
				player.userData.ammo = 15;
				player.userData.maxAmmo = 15;
				player.userData.isReloading = false;
				scene.add(player);
			}
			else {
				remotePlayers[spawnSlot] = tank;
				remotePlayers[spawnSlot].userData.dead = false;
				remotePlayers[spawnSlot].userData.bullets = [];
				remotePlayers[spawnSlot].userData.health = 6;
				remotePlayers[spawnSlot].userData.maxHealth = 6;
				remotePlayers[spawnSlot].userData.ammo = 15;
				remotePlayers[spawnSlot].userData.maxAmmo = 15;
				remotePlayers[spawnSlot].userData.isReloading = false;
				scene.add(tank);
			}
		}

		switch (type) {
			case 1: clone = models.metal.clone(); break;
			case 2: clone = models.glass.clone(); break;
			case 3: clone = models.water.clone(); break;
			case 4: clone = models.blue.clone(); break;
			case 5: clone = models.green.clone(); break;
			case 6: clone = models.yellow.clone(); break;
			case 7: clone = models.wood.clone(); break;
			case 8: clone = models.dirt.clone(); break;
			case 9: clone = models.bricks.clone(); break;
			case 10: clone = models.lava.clone(); break;
			default: clone = null;
		}

		if (clone) {
			clone.position.set(realX, 0, realZ);
			if (type === 2) {
				clone.userData.maxHealth = 2;
				clone.userData.health  = 2;
				clone.userData.isDestructible = true;
			}
			if (type === 7 || type === 8) {
				clone.userData.maxHealth = 4;
				clone.userData.health  = 4;
				clone.userData.isDestructible = true;
			}
			if (type === 9) {
				clone.userData.maxHealth = 5;
				clone.userData.health  = 5;
				clone.userData.isDestructible = true;
			}
			if (type === 3 || type === 10) {
				clone.position.set(realX, -blockSize, realZ);
			}
			scene.add(clone);
		}
		blocks[y][x] = clone;
	}

	function checkCollision(player) {
		const collisionSize = blockSize * 0.8;
		const playerCenter =
			new THREE.Vector3(player.position.x, -blockSize / 2, player.position.z);
		const playerBox =
			new THREE.Box3().setFromCenterAndSize(playerCenter,
			new THREE.Vector3(collisionSize, collisionSize, collisionSize));

		for (let row of blocks) {
			for (let block of row) {
				if (block) {
					const blockBox = new THREE.Box3().setFromObject(block);
					if (playerBox.intersectsBox(blockBox)) return true;
				}
			}
		}

		for (let key in remotePlayers) {
			const enemy = remotePlayers[key];
			const enemyCenter =
				new THREE.Vector3(enemy.position.x, -blockSize / 2, enemy.position.z);
			const enemyBox =
				new THREE.Box3().setFromCenterAndSize(enemyCenter,
				new THREE.Vector3(collisionSize, collisionSize, collisionSize));
			if (playerBox.intersectsBox(enemyBox)) return true;
		}
		return false;
	}
	return () => {
		isMounted = false;
		renderer.setAnimationLoop(null);
		window.removeEventListener('resize', onResize);
		window.removeEventListener('keydown', onKeyDown);
		window.removeEventListener('keyup', onKeyUp);
		window.removeEventListener('blur', onBlur);

		if (container.contains(renderer.domElement)) {
			container.removeChild(renderer.domElement);
		}
		if (socket) {
			socket.disconnect();
		}
	};
}
