const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addWin(username)
{
	try
	{
		return await prisma.user.update({
			where: {
				username: username
			},
			data: {
				wins: {
					increment: 1
				}
			},
		});
	}
	catch (error)
	{
		console.error("addWin error: ", error);
	}
}

async function recordGameHistory({ playerId, isWin, score, duration }) {
	try
	{
		return await prisma.gameHistory.create({
			data: {
				playerId: playerId,
				winnerId: isWin ? playerId : null,
				playerScore: score || 0,
				duration: duration || 0,
				opponentId: null,
				opponentScore: 0
			}
		});
	}
	catch (error)
	{
		console.error("recordGameHistory error: ", error);
	}
}

module.exports = {
	prisma,
	addWin,
	recordGameHistory
}
