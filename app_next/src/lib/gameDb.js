const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recordGameResult(leaderboard, winnerUsername) 
{
	    try 
	    {
		    const winner = await prisma.user.findUnique({
			    where: { username: winnerUsername },
		    });
		    const winnerId = winner ? winner.id : null;

		    const game = await prisma.gameHistory.create({
			    data: {
				    winnerId: winnerId,
			    },
		    });

		    for (const player of leaderboard)
		    {
			    const user = await prisma.user.findUnique({
				    where: { username: player.username },
			    });

			    if (user)
			    {
				    await prisma.gamePlayer.create({
					    data: {
						    gameId: game.id,
						    playerId: user.id,
						    kills: player.score,
					    },
				    });
				    await prisma.user.update({
					    where: { id: user.id },
					    data: {
						    kills: { increment: player.score },
						    gamesPlayed: { increment: 1 },
						    wins: winnerId === user.id ? { increment: 1 } : undefined,
					    },
				    });
			    }
		    }
	    }
	    catch (error)
	    {
	        console.error("Error recording game result:", error);
		throw error;
	    }
}

module.exports = {
	recordGameResult,
};
