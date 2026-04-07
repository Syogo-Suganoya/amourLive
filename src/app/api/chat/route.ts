import { NextRequest, NextResponse } from 'next/server'
import { processConversation } from '@/lib/engine'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { message, userId = 'test-user-id', characterId = 'heroine_01' } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // 1. UserCharacter IDを取得（デモ用に簡略化。本来は認証や選択から取得）
    const uc = await prisma.userCharacter.findUnique({
      where: {
        userId_characterId: { userId, characterId }
      }
    })

    if (!uc) {
      return NextResponse.json({ error: 'UserCharacter association not found' }, { status: 404 })
    }

    // 2. ゲームエンジンでの処理
    const result = await processConversation(uc.id, message)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
