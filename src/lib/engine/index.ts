import { prisma } from '@/lib/prisma'
import { generateJSON } from '@/lib/ai'
import { INTENT_ANALYSIS_PROMPT, RESPONSE_GENERATION_PROMPT } from './prompts'

export type ProcessResult = {
  dialogue: string
  emotion: string
  thought?: string
  newState: {
    affection: number
    trust: number
    relationshipStage: string
  }
}

/**
 * 会話プロセスのメインロジック
 */
export async function processConversation(
  userCharacterId: string,
  userInput: string
): Promise<ProcessResult> {
  // 1. キャラクターと現在のステータスを読み込む
  const uc = await prisma.userCharacter.findUnique({
    where: { id: userCharacterId },
    include: {
      character: true,
      state: true,
      memories: { take: 10, orderBy: { importance: 'desc' } },
      logs: { take: 5, orderBy: { createdAt: 'desc' } }
    }
  })

  if (!uc || !uc.state) throw new Error('UserCharacter not found or state not initialized')

  // 2. 意図解析 (Intent Analysis)
  const intentPrompt = INTENT_ANALYSIS_PROMPT
    .replace('{{userInput}}', userInput)
    .replace('{{characterPersonality}}', uc.character.personality)
    .replace('{{relationshipStage}}', uc.state.relationshipStage);

  const intent = await generateJSON<{
    affectionDelta: number
    trustDelta: number
    intent: string
    detectedAffection: string
    summary: string
  }>(intentPrompt);

  // 3. 状態更新 (State Management)
  const newAffection = Math.max(0, uc.state.affection + intent.affectionDelta);
  const newTrust = Math.max(0, uc.state.trust + intent.trustDelta);
  
  // 関係性の発展ロジック（簡易版）
  let newStage = uc.state.relationshipStage;
  if (newAffection > 100 && newStage === 'friend') newStage = 'lover';
  else if (newAffection > 50 && newStage === 'acquaintance') newStage = 'friend';
  else if (newAffection > 20 && newStage === 'stranger') newStage = 'acquaintance';

  const updatedState = await prisma.characterState.update({
    where: { userCharacterId: uc.id },
    data: {
      affection: newAffection,
      trust: newTrust,
      relationshipStage: newStage
    }
  });

  // 4. キャラクター応答生成 (Response Generation)
  const memoryStr = uc.memories.map(m => `[${m.category}] ${m.content}`).join('\n');
  const logStr = uc.logs.reverse().map(l => `${l.role === 'user' ? 'ユーザー' : uc.character.name}: ${l.content}`).join('\n');

  const responsePrompt = RESPONSE_GENERATION_PROMPT
    .replace('{{characterName}}', uc.character.name)
    .replace('{{characterPersonality}}', uc.character.personality)
    .replace('{{speechStyle}}', uc.character.speechStyle)
    .replace('{{coreRules}}', uc.character.coreRules)
    .replace('{{affection}}', updatedState.affection.toString())
    .replace('{{trust}}', updatedState.trust.toString())
    .replace('{{relationshipStage}}', updatedState.relationshipStage)
    .replace('{{memories}}', memoryStr || 'なし')
    .replace('{{conversationLogs}}', logStr || '過去の会話なし')
    .replace('{{intent}}', intent.intent)
    .replace('{{detectedAffection}}', intent.detectedAffection)
    .replace('{{summary}}', intent.summary)
    .replace('{{userInput}}', userInput);

  const aiResponse = await generateJSON<{
    dialogue: string
    emotion: string
    thought?: string
  }>(responsePrompt);

  // 5. 会話ログの保存 (Async)
  await prisma.conversationLog.createMany({
    data: [
      { userCharacterId: uc.id, role: 'user', content: userInput },
      { userCharacterId: uc.id, role: 'assistant', content: aiResponse.dialogue }
    ]
  });

  // TODO: 記憶の更新 (バックグラウンドで要約処理などを行う余地あり)

  return {
    ...aiResponse,
    newState: {
      affection: updatedState.affection,
      trust: updatedState.trust,
      relationshipStage: updatedState.relationshipStage
    }
  };
}
