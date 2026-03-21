import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid profile ID' },
        { status: 400 }
      );
    }

    const profile = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        tankName: true,
        tankColor: true,
        tankLevel: true,
        xp: true,
        wins: true,
        gamesPlayed: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        gamesAsPlayer: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            opponentId: true,
            winnerId: true,
            playerScore: true,
            opponentScore: true,
            duration: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid profile ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { tankName, tankColor } = body;

    const updates: { tankName?: string; tankColor?: string } = {};
    if (tankName !== undefined) updates.tankName = tankName;
    if (tankColor !== undefined) updates.tankColor = tankColor;

    const profile = await db.user.update({
      where: { id: userId },
      data: updates,
      select: {
        id: true,
        username: true,
        tankName: true,
        tankColor: true,
        tankLevel: true,
      },
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      data: profile,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid profile ID' },
        { status: 400 }
      );
    }

    await db.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      message: 'Profile deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500 }
    );
  }
}
