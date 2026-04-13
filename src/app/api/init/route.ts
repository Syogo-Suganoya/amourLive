import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const characterId = searchParams.get('characterId')
    const location = searchParams.get('location')
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    let uc;

    if (location) {
      // 場所からそこにいるキャラクターを探す
      uc = await prisma.userCharacter.findFirst({
        where: {
          userId,
          state: {
            currentLocation: location
          }
        },
        include: {
          character: true,
          state: true,
          logs: { take: 20, orderBy: { createdAt: 'asc' } }
        }
      })

      if (!uc) {
        return NextResponse.json({ characterFound: false, location })
      }
    } else if (characterId) {
      // 特定のキャラクターIDで取得
      uc = await prisma.userCharacter.findUnique({
        where: {
          userId_characterId: { userId, characterId }
        },
        include: {
          character: true,
          state: true,
          logs: { take: 20, orderBy: { createdAt: 'asc' } }
        }
      })
    } else {
      return NextResponse.json({ error: 'characterId or location is required' }, { status: 400 })
    }

    return NextResponse.json({
      characterFound: true,
      characterId: uc.character.id,
      name: uc.character.name,
      state: uc.state,
      logs: uc.logs.map(l => ({ role: l.role, content: l.content }))
    })
  } catch (error) {
    console.error('Init API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
