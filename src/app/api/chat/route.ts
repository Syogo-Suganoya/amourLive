import { NextRequest, NextResponse } from 'next/server'
import { processConversation } from '@/lib/engine'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[API/Chat] Received request:', body);

    const { 
      message, 
      userId, 
      characterId = 'heroine_01', 
      isDebug = false,
      apiKey
    } = body

    if (!message || !userId) {
      return NextResponse.json({ error: 'Message and userId are required' }, { status: 400 })
    }

    // 1. UserCharacter IDを取得
    const uc = await prisma.userCharacter.findUnique({
      where: {
        userId_characterId: { userId, characterId }
      },
      include: {
        state: true,
        _count: {
          select: { logs: { where: { role: 'user' } } }
        }
      }
    })

    if (!uc || !uc.state) {
      return NextResponse.json({ error: 'UserCharacter association not found' }, { status: 404 })
    }

    // --- 体験版ロジック ---
    let effectiveApiKey = apiKey;
    const isTrial = !apiKey || apiKey.trim() === "";

    if (isTrial) {
      const TRIAL_MESSAGE_LIMIT = Number(process.env.TRIAL_MESSAGE_LIMIT) || 15;
      const TRIAL_AFFECTION_LIMIT = Number(process.env.TRIAL_AFFECTION_LIMIT) || 30;
      const adminKey = process.env.ADMIN_GEMINI_API_KEY;

      const messageCount = uc._count.logs;
      const currentAffection = uc.state.affection;

      if (messageCount >= TRIAL_MESSAGE_LIMIT || currentAffection >= TRIAL_AFFECTION_LIMIT) {
        return NextResponse.json({ 
          error: 'TRIAL_LIMIT_EXCEEDED',
          message: '体験版の制限に達しました。継続するにはご自身のGemini APIキーを入力してください。'
        }, { status: 403 });
      }

      if (!adminKey) {
        return NextResponse.json({ error: 'Admin API Key not configured' }, { status: 500 });
      }
      effectiveApiKey = adminKey;
    }

    // 2. ゲームエンジンでの処理
    const result = await processConversation(uc.id, message, isDebug, effectiveApiKey)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
