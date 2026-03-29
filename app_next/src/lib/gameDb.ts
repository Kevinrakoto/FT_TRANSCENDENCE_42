import { prisma } from "./prisma"

export async function recordGameResult(leaderboard: any[], winnerUsername: string) 
{
	    try 
	    {
		    const winner = await prisma.user.findUnique({
			    where: { username: winnerUsername },
		    });

		    const winnerId = winner ? winner.id : null;
		    for (const player of leaderboard)
		    {
			    const user = await prisma.user.findUnique({
				    where: { username: player.username },
			    });

			    if (user)
			    {
				    await prisma.gameResult.create({
					    data: {
						    playerId: user.id,
						    winnerId: winnerId,
						    kills: player.kills,
					    },
				    });
				    await prisma.user.update({
					    where: { id: user.id },
					    data: {
						    Kills: user.score,
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
