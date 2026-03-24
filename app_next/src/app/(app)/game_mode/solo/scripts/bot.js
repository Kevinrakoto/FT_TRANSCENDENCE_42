export class john
{
	constructor()
	{
	        this.target = null;
	        this.nextDecisionTime = 0;
	        this.currentDir = 's';
		this.lastShotTime = 0;
		this.shootCooldown = 1.0;
	}

	getDir(player, blocks, maps, blockSize)
	{
		const weights = {
			'w': 10,
			'a': 10,
			's': 10,
			'd': 10,
		}
		const mapH = blocks.length;
		const mapW = blocks[0].length;
		const x = Math.round((player.position.x / blockSize) + (mapW / 2) - 0.5);
		const y = Math.round((player.position.z / blockSize) + (mapH / 2) - 0.5);
		if (x < 0 || x >= mapW || y < 0 || y >= mapH)
			return this.currentDir;
		if (y > 0 && blocks[y - 1][x] !== null) weights['w'] = 0;
		if (y < mapH - 1 && blocks[y + 1][x] !== null) weights['s'] = 0;
		if (x > 0 && blocks[y][x - 1] !== null) weights['a'] = 0;
		if (x < mapW - 1 && blocks[y][x + 1] !== null) weights['d'] = 0;
		let totalWeight = 0;
		for (const key in weights) totalWeight += weights[key];
		if (totalWeight <= 0) return this.currentDir;
		let random = Math.random() * totalWeight;
		for (const dir in weights) 
		{
			if (random < weights[dir])
				return (dir);
			random -= weights[dir];
		}
		return (this.currentDir);
	}

	canShoot(currentDir, myX, myZ, remotePlayers, time)
	{
		if (time < this.lastShotTime + this.shootCooldown)
			return (false);
		const marging = 0.8;
		for (const key in remotePlayers)
		{
			const enemy = remotePlayers[key];
			if (!enemy || enemy.userData.dead || enemy.position.x === myX) 
				continue;
			const eX = enemy.position.x;
			const eZ = enemy.position.z;
			if (currentDir == 'w')
			{
				if (eZ < myZ && Math.abs(eX - myX) < marging) 
				{
					this.lastShotTime = time;
					return (true);
				}
			}
			else if (currentDir == 's')
			{
		                if (eZ > myZ && Math.abs(eX - myX) < marging) 
				{
					this.lastShotTime = time;
					return (true);
				}
			}
			else if (currentDir == 'a')
			{
		                if (eX < myX && Math.abs(eZ - myZ) < marging) 
				{
					this.lastShotTime = time;
					return (true);
				}
			}
			else if (currentDir == 'd')
			{
		                if (eX > myX && Math.abs(eZ - myZ) < marging) 
				{
					this.lastShotTime = time;
					return (true);
				}
			}
		}
		return (false);
	}

	update(player, remotePlayers, blocks, time, maps, blockSize)
	{
		const virtualInput = {};
	        const now = Date.now();
		const output = {
			moveDir: null,
			shoot: false
		};
		if (!player || player.userData.dead)
			return (output);
	        if (time > this.nextDecisionTime)
		{
			this.currentDir = this.getDir(player, blocks, maps, blockSize);
			this.nextDecisionTime = time + 1 + Math.random() * 2;
        	}
		output.shoot = this.canShoot(this.currentDir, player.position.x, player.position.z, remotePlayers, time);
		output.moveDir = this.currentDir;
		return output;
	}
};
