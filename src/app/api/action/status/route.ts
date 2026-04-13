import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * ステータス個別の増減操作（モックモード/デバッグ用）
 */
export async function POST(req: NextRequest) {
  try {
    const { characterId, type, delta, userId } = await req.json()

    if (!characterId || !type || !userId) {
      return NextResponse.json({ error: 'Missing parameters (characterId, type, userId)' }, { status: 400 })
    }

    const uc = await prisma.userCharacter.findUnique({
      where: { userId_characterId: { userId, characterId } },
      include: { state: true }
    })

    if (!uc || !uc.state) {
      return NextResponse.json({ error: 'State not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (type === 'affection') {
      updateData.affection = Math.max(0, uc.state.affection + delta)
    } else if (type === 'trust') {
      updateData.trust = Math.max(0, uc.state.trust + delta)
    }

    // 関係性ステージの自動更新ロジックも一応入れておく
    let newStage = uc.state.relationshipStage
    const newAff = type === 'affection' ? updateData.affection : uc.state.affection
    
    if (newAff > 100 && newStage === 'friend') newStage = 'lover'
    else if (newAff > 50 && newStage === 'acquaintance') newStage = 'friend'
    else if (newAff > 20 && newStage === 'stranger') newStage = 'acquaintance'
    
    updateData.relationshipStage = newStage

    const updatedState = await prisma.characterState.update({
      where: { id: uc.state.id },
      data: updateData
    })

    return NextResponse.json({ 
      success: true, 
      newState: {
        ...updatedState,
        flags: JSON.parse(updatedState.flags || '{}')
      } 
    })
  } catch (error) {
    console.error('Status Action Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
