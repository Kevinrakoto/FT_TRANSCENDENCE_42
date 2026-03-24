
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { io } from 'socket.io-client';

export function launchGame(container) {
	let isMounted = true;
	let socket = null;
	let myPlayerNumber = null;
	let numberOfPlayer = 2;
	let remotePlayers = {};
	let isGameRunning = false;

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
	let canShoot = true;
	let cooldown = 400;

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
	};

	const onBlur = () => {
		for (const k in input) {
			delete input[k];
		}
	};

	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
	window.addEventListener('blur', onBlur);

	const models = { tank: null, dirt: null, wood: null, lava: null, brickA: null, brickB: null, glass: null, metal: null, stone: null, tree: null, water: null };

	let player;

	const maps = {
		one:
		[[3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
		[3, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -2, 3],
		[3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 3],
		[3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 3],
		[3, 0, 2, 0, 2, 0, 2, 1, 2, 0, 2, 0, 2, 0, 3],
		[3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 3],
		[3, 0, 2, 0, 2, 0, 0, 0, 0, 0, 2, 0, 2, 0, 3],
		[3, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 3],
		[3, 1, 0, 2, 2, 0, 0, 0, 0, 0, 2, 2, 0, 1, 3],
		[3, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 3],
		[3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 3],
		[3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 3],
		[3, 0, 2, 0, 2, 0, 0, 0, 0, 0, 2, 0, 2, 0, 3],
		[3, -3, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, -4, 3],
		[3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]],

		two:
		[[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, -1, 3, 0, 3, 0, 3, 0, 3, 0, 3, 0, 3, -2, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 2, 0, 2, 0, 2, 0, 0, 0, 2, 0, 2, 0, 2, 1],
		[1, 3, 0, 3, 2, 2, 0, 2, 0, 2, 2, 3, 0, 3, 1],
		[1, 0, 0, 0, 0, 3, 0, 3, 0, 3, 0, 0, 0, 0, 1],
		[1, 9, 9, 0, 0, 2, 0, 9, 0, 2, 0, 0, 9, 9, 1],
		[1, 9, 9, 9, 0, 2, 2, 9, 2, 2, 0, 9, 9, 9, 1],
		[1, 9, 9, 9, 9, 2, 0, 9, 0, 2, 9, 9, 9, 9, 1],
		[1, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 1],
		[1, 0, 0, 0, 0, 2, 0, 9, 0, 2, 0, 0, 0, 0, 1],
		[1, 2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 1],
		[1, 0, 2, 0, 2, 0, 2, 2, 2, 0, 2, 0, 2, 0, 1],
		[1, -3, 2, 0, 2, 0, 2, 7, 2, 0, 2, 0, 2, -4, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]],

		three:
		[[7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
		[7, -1, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, -2, 7],
		[7, 0, 0, 0, 0, 2, 0, 0, 0, 1, 1, 1, 0, 0, 7],
		[7, 1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
		[7, 1, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 7],
		[7, 2, 0, 2, 2, 2, 0, 2, 2, 0, 10, 10, 0, 10, 7],
		[7, 2, 0, 0, 0, 2, 0, 0, 0, 0, 10, 0, 0, 0, 7],
		[7, 0, 0, 0, 0, 10, 10, 0, 10, 10, 10, 0, 2, 2, 7],
		[7, 2, 2, 2, 0, 10, 2, 0, 2, 2, 0, 0, 0, 0, 7],
		[7, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 1, 0, 7],
		[7, 10, 10, 10, 0, 10, 0, 1, 0, 2, 0, 1, 0, 0, 7],
		[7, 0, 0, 0, 0, 2, 2, 2, 2, 2, 0, 1, 2, 2, 7],
		[7, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 7],
		[7, -3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -4, 7],
		[7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7]],
	};

	let map;
	let blockSize = 1;
	const blocks = [];

	loader.load('/tank-game/gltf/Tank.glb', (g) => { models.tank = g.scene; });
	loader.load('/tank-game/gltf/dirt.gltf', (g) => { models.dirt = g.scene; });
	loader.load('/tank-game/gltf/wood.gltf', (g) => { models.wood = g.scene; });
	loader.load('/tank-game/gltf/bricks_A.gltf', (g) => { models.brickA = g.scene; });
	loader.load('/tank-game/gltf/bricks_B.gltf', (g) => { models.brickB = g.scene; });
	loader.load('/tank-game/gltf/glass.gltf', (g) => { models.glass = g.scene; });
	loader.load('/tank-game/gltf/lava.gltf', (g) => { models.lava = g.scene; });
	loader.load('/tank-game/gltf/metal.gltf', (g) => { models.metal = g.scene; });
	loader.load('/tank-game/gltf/stone.gltf', (g) => { models.stone = g.scene; });
	loader.load('/tank-game/gltf/tree.gltf', (g) => { models.tree = g.scene; });
	loader.load('/tank-game/gltf/water.gltf', (g) => { models.water = g.scene; });
	loader.load('/tank-game/gltf/colored_block_green.gltf', (g) => { models.green = g.scene; });
	loader.load('/tank-game/gltf/colored_block_blue.gltf', (g) => { models.blue = g.scene; });
	loader.load('/tank-game/gltf/colored_block_red.gltf', (g) => { models.red = g.scene; });
	loader.load('/tank-game/gltf/colored_block_yellow.gltf', (g) => { models.yellow = g.scene; });

	manager.onLoad = () => {
		if (!isMounted) return;

		const box = new THREE.Box3().setFromObject(models.dirt);
		const size = new THREE.Vector3();
		box.getSize(size);
		blockSize = size.x;

		if (!socket) {
			socket = io('/tank-game', {
				transports: ['polling', 'websocket'],
				path: '/socket.io',
				rejectUnauthorized: false,
				autoConnect: false
			});
			setupSocketListener();
			socket.connect();
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

		if (loaded === false || isGameRunning === false) return;

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

		if (input[' '] && canShoot && player.userData.dead === false) {
			const geo = new THREE.SphereGeometry(0.17, 6, 6);
			const mat = new THREE.MeshBasicMaterial({color: 0xffffff});
			const bullet = new THREE.Mesh(geo, mat);

			bullet.position.copy(player.position);
			bullet.position.y += 0.8;
			bullet.userData.dir = bulldir;
			scene.add(bullet);
			bullets.push(bullet);

			socket.emit('shoot', {
				x: bullet.position.x,
				y: bullet.position.y,
				z: bullet.position.z,
				dir: bullet.userData.dir
			});

			canShoot = false;
			setTimeout (() => { canShoot = true; }, cooldown);
		}

		if (lastPressed && player.userData.dead === false) {
			if (lastPressed === 'w') player.rotation.y = Math.PI;
			if (lastPressed === 's') player.rotation.y = 0;
			if (lastPressed === 'd') player.rotation.y = Math.PI / 2;
			if (lastPressed === 'a') player.rotation.y = -Math.PI / 2;

			let speed  = player.userData.speed * delta;

			const X = player.position.x;
			const Z = player.position.z
		
			if (lastPressed === 'w') player.position.z -= speed;
			if (lastPressed === 's') player.position.z += speed;
			if (lastPressed === 'a') player.position.x -= speed;
			if (lastPressed === 'd') player.position.x += speed;

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

		let bSpeed = 25 * delta;

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
				if (enemy.userData.dead === false && bulletBox.intersectsBox(new THREE.Box3().setFromObject(enemy))) {
					hit = true;
					socket.emit('hitPlayer', {
						playerNumber: playerNumber
					});
					hitPlayer(playerNumber);
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

		updateHealthBar(player);
		for (let key in remotePlayers) {
			remotePlayers[key].userData.bullets.forEach(bullet => {
				if (bullet.userData.dir === 'w') bullet.position.z -= bSpeed;
				if (bullet.userData.dir === 's') bullet.position.z += bSpeed;
				if (bullet.userData.dir === 'a') bullet.position.x -= bSpeed;
				if (bullet.userData.dir === 'd') bullet.position.x += bSpeed;
			});
			updateHealthBar(remotePlayers[key]);
		}

		renderer.render( scene, camera );
	}

	function updateHealthBar(player) {
		const healthBar = player.getObjectByName('healthBar');

		healthBar.lookAt(camera.position);
		healthBar.rotation.y = 0;
		healthBar.rotation.z = 0;
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

			isGameRunning = true;
			loaded = true;
		});

		socket.on('waiting', (data) => {
			console.log(`Waiting for players: ${data.current}/${data.required}`);
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
					healthBar.children.forEach(bar => {
						bar.material.color.set(0xa4133c);
						bar.material.needsUpdate = true;
					});
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
			scene.add(bullet);
			if (remotePlayers[data.playerNumber]) {
				remotePlayers[data.playerNumber].userData.bullets.push(bullet);
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
			hitPlayer(data.playerNumber);
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

	function hitPlayer( playerNumber ) {
		let playerhit;
		if (playerNumber == myPlayerNumber) playerhit = player;
		else playerhit = remotePlayers[playerNumber];

		if (playerhit) {
			playerhit.userData.health -= 1;
			const healthBar = playerhit.getObjectByName('healthBar');
			if (healthBar) {
				if (playerhit.userData.health >= 0 && playerhit.userData.health < playerhit.userData.maxHealth) {
					const bar = healthBar.children[playerhit.userData.health];
					if (bar) {
						bar.material.color.set(0x1a1a1a);
						bar.material.needsUpdate = true;
					}
				}
			}
			playerhit.traverse((child) =>{
				if (child.isMesh && child.name !== 'healthBarSegment') {
					child.material = child.material.clone();
					const originalMap = child.material.map;
					const originalColor = child.material.color.clone();
					child.material.map = null;
					child.material.color.set(0xffffff);
					child.material.needsUpdate = true;
					setTimeout(() => {
						if (child.material) {
							child.material.map = originalMap;
							child.material.color.copy(originalColor);
							child.material.needsUpdate = true;
						}
						if (playerhit.userData.health <= 0) {
							playerhit.userData.dead = true;
							playerhit.position.x = 200;
							if (playerNumber == myPlayerNumber) respawn();
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
			healthBar.children.forEach(bar => {
				bar.material.color.set(0xa4133c);
				bar.material.needsUpdate = true;
			});
		}
		socket.emit('move', {
			x: player.position.x,
			z: player.position.z,
			rotation: player.rotation.y
		});
	}

	function createHealthBar( maxHealth ) {
		const group = new THREE.Group();
		const width = 1;
		group.name = 'healthBar';

		for (let i = 0; i < maxHealth; ++i) {
			const geometry = new THREE.BoxGeometry(width / maxHealth, 0.1, 0.05);
			const material = new THREE.MeshBasicMaterial({ color: 0xa4133c });
			const bar = new THREE.Mesh(geometry, material);

			bar.name = 'healthBarSegment';

			bar.position.x = (-width / 2) + (i * (width / maxHealth)) + ((width / maxHealth) / 2);

			group.add(bar);
		}

		return ( group );
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
			tank.traverse((c) => {
				if(c.isMesh) {
					c.material = c.material.clone();
					if (spawnSlot === myPlayerNumber) {
						if (c.material.color.g > c.material.color.r && c.material.color.g > c.material.color.b) {
							c.material.color.set(0x55aabb);
						}
					}
					else {
						if (c.material.color.g > c.material.color.r && c.material.color.g > c.material.color.b) {
							c.material.color.set(0xff5555);
						}
					}
				}
			});

			const healthBar = createHealthBar(3);
			healthBar.position.y = 1.5;
			tank.add(healthBar);

			if (spawnSlot === myPlayerNumber) {
				player = tank;
				player.userData.dead = false;
				player.userData.speed = 5;
				player.userData.health = 3;
				player.userData.maxHealth = 3;
				scene.add(player);
			}
			else {
				remotePlayers[spawnSlot] = tank;
				remotePlayers[spawnSlot].userData.dead = false;
				remotePlayers[spawnSlot].userData.bullets = [];
				remotePlayers[spawnSlot].userData.health = 3;
				remotePlayers[spawnSlot].userData.maxHealth = 3;
				scene.add(tank);
			}
		}

		switch (type) {
			case 11: clone = models.metal.clone(); break;
			case 13: clone = models.brickB.clone(); break;
			case 12: clone = models.stone.clone(); break;
			case 4: clone = models.glass.clone(); break;
			case 5: clone = models.brickA.clone(); break;
			case 6: clone = models.wood.clone(); break;
			case 14: clone = models.lava.clone(); break;
			case 8: clone = models.dirt.clone(); break;
			case 9: clone = models.tree.clone(); break;
			case 10: clone = models.water.clone(); break;
			case 1: clone = models.blue.clone(); break;
			case 3: clone = models.red.clone(); break;
			case 2: clone = models.green.clone(); break;
			case 7: clone = models.yellow.clone(); break;
			default: clone = null;
		}

		if (clone) {
			clone.position.set(realX, 0, realZ);
			if (type === 2) {
				clone.userData.maxHealth = 3;
				clone.userData.health  = 3;
				clone.userData.isDestructible = true;
			}
			if (type === 10)
				clone.position.set(realX, -blockSize, realZ);
			scene.add(clone);
		}
		blocks[y][x] = clone;
	}

	function checkCollision(player) {
		const playerBox = new THREE.Box3().setFromObject(player);
		playerBox.expandByScalar(-0.12);
		for (let row of blocks) {
			for (let block of row) {
				if (block) {
					const blockBox = new THREE.Box3().setFromObject(block);
					if (playerBox.intersectsBox(blockBox)) return true;
				}
			}
		}

		for (let key in remotePlayers) {
			const enemyBox = new THREE.Box3().setFromObject(remotePlayers[key]);
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
