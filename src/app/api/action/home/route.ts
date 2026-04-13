import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ERA_CONFIG_DATA } from '@/lib/constants'

/**
 * 「家で過ごす」アクション
 * 時間を進め、キャラクターの配置をシャッフルする。
 * 最低1名は必ず出現するように調整。
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const userCharacters = await prisma.userCharacter.findMany({
      where: { userId },
      include: { state: true, character: true }
    });

    // ユーザー時間と日付を更新
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      let nextDay = user.currentDay + 1;
      let nextMonth = user.currentMonth;
      if (nextDay > 30) {
        nextDay = 1;
        nextMonth = nextMonth >= 12 ? 1 : nextMonth + 1;
      }
      await prisma.user.update({
        where: { id: userId },
        data: { 
          currentTime: 0,
          currentDay: nextDay,
          currentMonth: nextMonth
        }
      });
    }

    let anyonePresent = false;
    const updates = userCharacters.map(async (uc) => {
      if (!uc.state) return;
      
      const era = uc.character.era || 'modern';
      const availableLocations = ERA_CONFIG_DATA[era]?.locations || ["cafe", "park", "library"];
      
      // 50%の確率でどこかに出現
      const isPresent = Math.random() > 0.5;
      let nextLoc = "";
      if (isPresent) {
        nextLoc = availableLocations[Math.floor(Math.random() * availableLocations.length)];
        anyonePresent = true;
      }

      return prisma.characterState.update({
        where: { id: uc.state.id },
        data: { currentLocation: nextLoc }
      });
    });

    await Promise.all(updates);

    // 最低1名保障ロジック: 全員が不在（空文字）になった場合、ランダムに一人を配置
    if (!anyonePresent && userCharacters.length > 0) {
      console.log('[API/Home] No one present, forcing one character to appear.');
      const luckyIndex = Math.floor(Math.random() * userCharacters.length);
      const luckyUc = userCharacters[luckyIndex];
      if (luckyUc.state) {
        const era = luckyUc.character.era || 'modern';
        const availableLocations = ERA_CONFIG_DATA[era]?.locations || ["cafe", "park", "library"];
        await prisma.characterState.update({
          where: { id: luckyUc.state.id },
          data: { currentLocation: availableLocations[Math.floor(Math.random() * availableLocations.length)] }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Home Action Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
