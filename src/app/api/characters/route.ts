import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const isDebug = searchParams.get('isDebug') === 'true'
  const era = searchParams.get('era')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }
  
  try {
    const characters = await prisma.character.findMany({
      where: era ? { era } : undefined,
      include: {
        userCharacters: {
          where: { userId },
          include: { state: true }
        }
      }
    })

    const formattedCharacters = await Promise.all(characters.map(async c => {
      const uc = c.userCharacters[0]
      let location = uc?.state?.currentLocation || ""
      
      if (isDebug) {
        // デバックモード時は常にデフォルト位置
        location = c.location
      } else if (!location && uc?.state) {
        // 通常モードで居場所が決まっていない場合はデフォルトを設定して更新
        location = c.location
        await prisma.characterState.update({
          where: { id: uc.state.id },
          data: { currentLocation: location }
        })
      }

      return {
        id: c.id,
        name: c.name,
        era: c.era,
        location: location,
        personality: JSON.parse(c.personality),
        state: uc?.state ? {
          affection: uc.state.affection,
          trust: uc.state.trust,
          relationshipStage: uc.state.relationshipStage,
          hasContact: JSON.parse(uc.state.flags || '{}').hasContact || false,
          isBlocked: JSON.parse(uc.state.flags || '{}').isBlocked || false,
        } : null
      }
    }))

    const user = await prisma.user.findUnique({ where: { id: userId } })

    return NextResponse.json({
      characters: formattedCharacters,
      currentTime: user?.currentTime || 0,
      currentMonth: user?.currentMonth || 4,
      currentDay: user?.currentDay || 1
    })
  } catch (error) {
    console.error('Characters API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
