import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { loginId, password, name } = await req.json();

    if (!loginId || !password || !name) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // 重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { loginId }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Login ID already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        loginId,
        password: hashedPassword,
        name,
      }
    });

    // 初期化: 全キャラクターとの関係を作成
    const characters = await prisma.character.findMany();
    for (const char of characters) {
      await prisma.userCharacter.create({
        data: {
          userId: user.id,
          characterId: char.id,
          state: {
            create: {
              affection: 10,
              trust: 5,
              relationshipStage: 'stranger',
              currentLocation: char.location,
              flags: JSON.stringify({}),
            }
          }
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      user: { id: user.id, name: user.name, loginId: user.loginId } 
    });

  } catch (error) {
    console.error('Signup Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
