import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const userId = 'test-user-id'
    const characterId = 'heroine_01'

    const uc = await prisma.userCharacter.findUnique({
      where: {
        userId_characterId: { userId, characterId }
      },
      include: {
        character: true,
        state: true,
        logs: { take: 20, orderBy: { createdAt: 'asc' } }
      }
    })

    if (!uc) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 })
    }

    return NextResponse.json({
      name: uc.character.name,
      state: uc.state,
      logs: uc.logs.map(l => ({ role: l.role, content: l.content }))
    })
  } catch (error) {
    console.error('Init API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
