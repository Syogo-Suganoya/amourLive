import { prisma } from '@/lib/prisma'
import { generateJSON } from '@/lib/ai'
import { INTENT_ANALYSIS_PROMPT, RESPONSE_GENERATION_PROMPT } from './prompts'
import { ERA_CONFIG_DATA } from '@/lib/constants'

export type ProcessResult = {
  dialogue: string
  emotion: string
  thought?: string
  newState: {
    affection: number
    trust: number
    relationshipStage: string
    flags: Record<string, any>
  }
  currentTime: number
}

/**
 * 会話プロセスのメインロジック
 */
export async function processConversation(
  userCharacterId: string,
  userInput: string,
  isDebug: boolean = false,
  apiKey?: string
): Promise<ProcessResult> {
  console.log(`[Engine] Processing conversation: charId=${userCharacterId}, isDebug=${isDebug}`);

  // 1. キャラクターと現在のステータスを読み込む
  const uc = await prisma.userCharacter.findUnique({
    where: { id: userCharacterId },
    include: {
      character: true,
      state: true,
      user: true,
      memories: { take: 10, orderBy: { importance: 'desc' } },
      logs: { take: 20, orderBy: { createdAt: 'desc' } }
    }
  })

  if (!uc || !uc.state) throw new Error('UserCharacter not found or state not initialized')

  // 現在のフラグをパース
  let currentFlags: Record<string, any> = {};
  try {
    currentFlags = JSON.parse(uc.state.flags || '{}');
  } catch (e) {
    console.error('Failed to parse flags:', e);
  }

  let intent: any;
  let aiResponse: any;
  const systemInstructions: string[] = [];
  const nextFlags = { ...currentFlags };

  if (isDebug) {
    console.log(`[Engine] Running in DEBUG mode. Total logs: ${uc.logs.length}`);
    // --- デバックモードの処理 ---
    // チャット回数（ユーザーとアシスタントのペア）を計算
    const chatCount = Math.floor(uc.logs.length / 2);

    const isContactTrigger = userInput.includes("連絡先") || (chatCount >= 5 && !currentFlags.hasContact);
    const isDateTrigger = userInput.includes("デート") || (chatCount >= 8 && !currentFlags.vowDate);

    intent = {
      affectionDelta: 5,
      trustDelta: 2,
      intent: "CHITCHAT",
      detectedAffection: "POSITIVE",
      isRequestingContact: isContactTrigger,
      isRequestingDate: isDateTrigger,
      providedName: userInput.includes("名前は") ? userInput.split("名前は")[1] : null,
      summary: "デバック入力の要約"
    };

    const isNameAskTrigger = chatCount >= 2 && !currentFlags.askedName && !currentFlags.userName;

    aiResponse = {
      dialogue: isNameAskTrigger 
        ? "（デバック：3回目の会話）そういえば、まだお名前を聞いていませんでしたね。お名前、教えてもらってもいいですか？"
        : isContactTrigger && !currentFlags.hasContact
          ? "（デバック：5回以上話したので）LINE教えてもいいですよ！IDはDebugID_001です。" 
          : isDateTrigger && !currentFlags.vowDate
            ? "（デバック：さらに話したので）今度どこか遊びに行きませんか？デートしましょう！"
            : `（デバック：${chatCount + 1}回目の会話）「${userInput}」についてですね。`,
      emotion: isNameAskTrigger || isDateTrigger || isContactTrigger ? "smile" : "normal",
      thought: "デバックモードでの内心です。"
    };
    if (isNameAskTrigger) nextFlags.askedName = true;
  } else {
    console.log('[Engine] Running in AI mode');
    // --- 通常モード（AI）の処理 ---
    const intentPrompt = INTENT_ANALYSIS_PROMPT
      .replace('{{userInput}}', userInput)
      .replace('{{characterPersonality}}', uc.character.personality)
      .replace('{{relationshipStage}}', uc.state.relationshipStage)
      .replace('{{era}}', getEraLabel(uc.character.era))
      .replace('{{timeContext}}', getTimeContext(uc.user.currentTime))
      .replace('{{seasonContext}}', getSeasonContext(uc.user.currentMonth, uc.user.currentDay));

    intent = await generateJSON<{
      affectionDelta: number
      trustDelta: number
      intent: string
      detectedAffection: string
      isRequestingContact: boolean
      isRequestingDate: boolean
      providedName: string | null
      summary: string
    }>(intentPrompt, "gemini-1.5-flash", apiKey);
  }

  // 検出された名前を保存
  if (intent.providedName) {
    nextFlags.userName = intent.providedName;
    console.log(`[Engine] User introduced themselves as: ${intent.providedName}`);
  }

  // 3. 状態更新 (State Management)
  const newAffection = Math.max(-50, uc.state.affection + intent.affectionDelta);
  const newTrust = Math.max(0, uc.state.trust + intent.trustDelta);
  
  let newStage = uc.state.relationshipStage;
  if (newAffection > 100 && newStage === 'friend') newStage = 'lover';
  else if (newAffection > 50 && newStage === 'acquaintance') newStage = 'friend';
  else if (newAffection > 20 && newStage === 'stranger') newStage = 'acquaintance';

  const chatCount = Math.floor(uc.logs.length / 2);

  // ブロック判定
  if (newAffection < 0) {
    if (!nextFlags.isBlocked) {
      nextFlags.isBlocked = true;
      nextFlags.hasContact = false;
      console.log(`[Engine] Character ${uc.character.name} blocked the user (Affection: ${newAffection})`);
    }
    systemInstructions.push('【重要】あなたはユーザーに対して非常に強い不快感や怒りを感じており、連絡先をブロックしました。会話は非常に冷淡で、拒絶的な態度をとってください。仲直りしようとするユーザーを冷たくあしらってください。');
  } else if (nextFlags.isBlocked) {
    nextFlags.isBlocked = false;
    console.log(`[Engine] Character ${uc.character.name} unblocked the user (Affection: ${newAffection})`);
    systemInstructions.push('【重要】ブロックを解除しましたが、まだ完全に許したわけではありません。少し距離を置いた態度から始めてください。');
  }

  if (!isDebug) {
    // 名前を尋ねるトリガー
    if (chatCount >= 2 && !nextFlags.userName && !nextFlags.askedName && !nextFlags.isBlocked) {
      systemInstructions.push('まだユーザーの名前を知らないので、会話の自然な流れでお名前（本名、または呼び名）を尋ねてください。');
      nextFlags.askedName = true;
    }

    if (!nextFlags.hasContact) {
      if (intent.isRequestingContact) {
        if (newAffection > 40 || newTrust > 40) {
          systemInstructions.push('ユーザーからの連絡先交換の申し出を快諾し、具体的な連絡先（LINE IDなど）を教えてください。');
          nextFlags.hasContact = true;
        } else {
          systemInstructions.push('ユーザーから連絡先を聞かれましたが、まだ早いと感じて、丁寧に断ってください。');
        }
      } else if (newAffection > 60 && Math.random() > 0.7) {
        systemInstructions.push('あなたの方から、もっと親密になるために連絡先（LINEなど）を交換しないか提案してください。');
        nextFlags.hasContact = true;
      }
    }

    if (intent.isRequestingDate) {
      if (newStage === 'friend' || newStage === 'lover' || newAffection > 70) {
        systemInstructions.push('ユーザーからのデートや遊びの誘いを喜んで受け入れてください。具体的な場所や日程について前向きに話してください。');
        nextFlags.vowDate = true;
      } else {
        systemInstructions.push('ユーザーからデートに誘われましたが、まだそこまでの関係ではないため、濁すか丁寧に断ってください。');
      }
    }
  } else {
    if (intent.isRequestingContact) nextFlags.hasContact = true;
    if (intent.isRequestingDate) nextFlags.vowDate = true;
  }

  const updatedState = await prisma.characterState.update({
    where: { userCharacterId: uc.id },
    data: {
      affection: newAffection,
      trust: newTrust,
      relationshipStage: newStage,
      flags: JSON.stringify(nextFlags)
    }
  });

  // 居場所の移動判定ロジック
  const currentEra = uc.character.era || 'modern';
  const availableLocations = ERA_CONFIG_DATA[currentEra]?.locations || ["cafe", "park", "library"];
  const moveChance = 0.4; // 40%の確率で移動を検討
  if (Math.random() < moveChance) {
    let nextLocation = updatedState.currentLocation;
    const dice = Math.random();
    
    if (dice < 0.2) {
      nextLocation = ""; // 20%の確率でMapから姿を消す（外出など）
    } else {
      // 既存の場所以外からランダムに選択
      const otherPool = availableLocations.filter(l => l !== updatedState.currentLocation);
      nextLocation = otherPool[Math.floor(Math.random() * otherPool.length)];
    }

    console.log(`[Engine] Character ${uc.character.name} moving from ${updatedState.currentLocation} to ${nextLocation}`);
    await prisma.characterState.update({
      where: { id: updatedState.id },
      data: { currentLocation: nextLocation }
    });
  }

  if (!isDebug) {
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
      .replace('{{flags}}', JSON.stringify(nextFlags))
      .replace('{{systemInstructions}}', systemInstructions.length > 0 ? systemInstructions.join('\n') : '特別に指示はありません。自然に会話してください。')
      .replace('{{memories}}', memoryStr || 'なし')
      .replace('{{conversationLogs}}', logStr || '過去の会話なし')
      .replace('{{era}}', getEraLabel(uc.character.era))
      .replace('{{timeContext}}', getTimeContext(uc.user.currentTime))
      .replace('{{seasonContext}}', getSeasonContext(uc.user.currentMonth, uc.user.currentDay))
      .replace('{{intent}}', intent.intent)
      .replace('{{detectedAffection}}', intent.detectedAffection)
      .replace('{{summary}}', intent.summary)
      .replace('{{userInput}}', userInput);

    aiResponse = await generateJSON<{
      dialogue: string
      emotion: string
      thought?: string
    }>(responsePrompt, "gemini-1.5-flash", apiKey);
  }

  console.log('[Engine] Saving logs to database');
  // 5. 会話ログの保存 (Individual creates for SQLite compatibility)
  await prisma.conversationLog.create({
    data: { userCharacterId: uc.id, role: 'user', content: userInput }
  });
  await prisma.conversationLog.create({
    data: { userCharacterId: uc.id, role: 'assistant', content: aiResponse.dialogue }
  });

  // イベント履歴の保存
  if (nextFlags.hasContact && !currentFlags.hasContact) {
    await prisma.eventHistory.create({
      data: { userCharacterId: uc.id, eventName: 'CONTACT_EXCHANGED' }
    });
  }
  if (nextFlags.vowDate && !currentFlags.vowDate) {
    await prisma.eventHistory.create({
      data: { userCharacterId: uc.id, eventName: 'DATE_VOWED' }
    });
  }

  console.log('[Engine] Conversation update complete');

  // --- 時間経過の処理 ---
  const nextTime = (uc.user.currentTime + 1) % 6; // 6段階：0:早朝, 1:午前, 2:昼下がり, 3:夕暮れ, 4:夜, 5:深夜
  await prisma.user.update({
    where: { id: uc.userId },
    data: { currentTime: nextTime }
  });

  return {
    ...aiResponse,
    newState: {
      affection: updatedState.affection,
      trust: updatedState.trust,
      relationshipStage: updatedState.relationshipStage,
      flags: nextFlags
    },
    currentTime: nextTime
  };
}

function getEraLabel(era: string) {
  switch (era) {
    case 'showa': return '昭和';
    case 'edo': return '江戸時代';
    case 'heian': return '平安時代';
    default: return '現代';
  }
}

function getTimeContext(time: number) {
  const contexts = [
    "早朝 (Early Morning) - 街が静まり返り、朝日が昇り始める時間帯",
    "午前 (Morning) - 活動が始まり、活気に満ちた爽やかな時間帯",
    "昼下がり (Afternoon) - 穏やかで暖かい、午後のひととき",
    "夕暮れ (Evening) - 空が赤く染まり、一日が終わりに向かう少し寂しい時間帯",
    "夜 (Night) - 暗くなり、落ち着いた時間が流れる夜の時間帯",
    "深夜 (Late Night) - 静寂に包まれ、二人きりのような親密さが生まれる時間帯"
  ];
  return contexts[time] || contexts[0];
}

function getSeasonContext(month: number, day: number) {
  let season = "春";
  let description = "心地よい気候で、新しい始まりを感じる季節です。";
  if (month >= 3 && month <= 5) {
    season = "春";
    description = "街ではお花見などの春らしいイベントが行われています。";
  } else if (month >= 6 && month <= 8) {
    season = "夏";
    description = "暑い季節です。花火大会や夏祭りなどが開かれています。";
  } else if (month >= 9 && month <= 11) {
    season = "秋";
    description = "涼しくなってきました。紅葉や月見の季節です。";
  } else {
    season = "冬";
    description = "寒い季節です。雪が降ったり、イルミネーションが点灯したりしています。";
  }
  return `現在は${month}月${day}日 (${season}) です。${description}`;
}
