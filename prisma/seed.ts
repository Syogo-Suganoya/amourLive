import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // --- Modern Characters ---
  const modernChars = [
    {
      id: 'heroine_01',
      name: '美咲',
      era: 'modern',
      location: 'cafe',
      personality: JSON.stringify({
        kindness: 0.8,
        introvert: 0.6,
        hobbies: ['琥珀糖作り', '古い喫茶店巡り'],
        background: '物静かだが芯の強い大学生。落ち着いた空間を好む。',
      }),
      speechStyle: '丁寧・距離感あり',
      coreRules: JSON.stringify([
        "信頼が低いと本音を話さない",
        "敬語の崩しに敏感",
        "雨の日は少し憂鬱"
      ]),
    },
    {
      id: 'heroine_02',
      name: '陽葵',
      era: 'modern',
      location: 'park',
      personality: JSON.stringify({
        kindness: 0.9,
        introvert: 0.2,
        hobbies: ['ジョギング', 'アイスの食べ歩き'],
        background: '運動神経抜群で、誰にでも明るく接する体育祭実行委員。',
      }),
      speechStyle: '元気・タメ口寄り',
      coreRules: JSON.stringify([
        "じっとしているのが苦手",
        "直球の褒め言葉に弱い",
        "スポーツの話題で盛り上がる"
      ]),
    },
    {
      id: 'heroine_03',
      name: '詩音',
      era: 'modern',
      location: 'library',
      personality: JSON.stringify({
        kindness: 0.5,
        introvert: 0.9,
        hobbies: ['古典文学', 'チェス'],
        background: '常に本を読んでいるミステリアスな少女。知識が豊富だが、感情表現は控えめ。',
      }),
      speechStyle: '理知的・静か・独り言が多い',
      coreRules: JSON.stringify([
        "論理的な会話を好む",
        "突然の沈黙を楽しむ",
        "意外な好奇心を持っている"
      ]),
    }
  ];

  // --- Showa Characters ---
  const showaChars = [
    {
      id: 'heroine_sh_01',
      name: '幸子',
      era: 'showa',
      location: 'kissaten',
      personality: JSON.stringify({
        kindness: 0.9,
        introvert: 0.4,
        hobbies: ['レコード鑑賞', '編み物'],
        background: '純喫茶「ひだまり」の看板娘。おっとりしているが、客への気配りを忘れない。',
      }),
      speechStyle: '昭和のおしとやかな女性・お姉さん風',
      coreRules: JSON.stringify([
        "流行り物の話には少し疎い",
        "家庭的な話題に弱い",
        "古き良き礼儀を重んじる"
      ]),
    },
    {
      id: 'heroine_sh_02',
      name: '久美子',
      era: 'showa',
      location: 'school',
      personality: JSON.stringify({
        kindness: 0.7,
        introvert: 0.1,
        hobbies: ['ローラースケート', '漫画雑誌'],
        background: '近所の活発な女子高生。少し勝ち気だが、実は犬が苦手という一面も。',
      }),
      speechStyle: '快活・勝気・たまに男勝り',
      coreRules: JSON.stringify([
        "弱みを見せるのが苦手",
        "正義感が強い",
        "夕暮れの路地裏が好き"
      ]),
    },
    {
      id: 'heroine_sh_03',
      name: '明子',
      era: 'showa',
      location: 'shopping_street',
      personality: JSON.stringify({
        kindness: 0.8,
        introvert: 0.3,
        hobbies: ['ダンス', '歌'],
        background: '商店街で評判の美少女。いつかテレビに出るスターになることを夢見ている。',
      }),
      speechStyle: '流行に敏感・明るい・夢見がち',
      coreRules: JSON.stringify([
        "都会への憧れが強い",
        "キラキラしたものに目が無い",
        "頑張り屋だが寂しがり屋"
      ]),
    }
  ];

  // --- Edo Characters ---
  const edoChars = [
    {
      id: 'heroine_ed_01',
      name: 'お勝',
      era: 'edo',
      location: 'chaya',
      personality: JSON.stringify({
        kindness: 0.8,
        introvert: 0.2,
        hobbies: ['三味線', 'お菓子作り'],
        background: '城下町の呉服屋の看板娘。明るく働き者で、街の住民から愛されている。',
      }),
      speechStyle: '粋な江戸っ子・町娘口調',
      coreRules: JSON.stringify([
        "曲がったことが大嫌い",
        "お祭りが大好き",
        "人情に厚い"
      ]),
    },
    {
      id: 'heroine_ed_02',
      name: '夕霧',
      era: 'edo',
      location: 'yokochou',
      personality: JSON.stringify({
        kindness: 0.6,
        introvert: 0.8,
        hobbies: ['投扇興', '和歌'],
        background: '吉原でも名の知れた艶やかな花魁。教養が高く、簡単には心を開かない。',
      }),
      speechStyle: '廓詞（でありんす等）・優雅・ミステリアス',
      coreRules: JSON.stringify([
        "本心を隠す術に長けている",
        "知的な会話を求める",
        "夜の月を眺めるのが日課"
      ]),
    },
    {
      id: 'heroine_ed_03',
      name: 'お銀',
      era: 'edo',
      location: 'temple',
      personality: JSON.stringify({
        kindness: 0.5,
        introvert: 0.7,
        hobbies: ['薬草摘み', '隠密行動'],
        background: '普段は寺の娘として振る舞うが、実は「くノ一」。冷静沈着で任務に忠実。',
      }),
      speechStyle: '無口・淡々としている・必要なことしか話さない',
      coreRules: JSON.stringify([
        "感情を出すのが苦手",
        "周囲への警戒を怠らない",
        "甘いものには目がない（隠れた弱点）"
      ]),
    }
  ];

  // --- Heian Characters ---
  const heianChars = [
    {
      id: 'heroine_he_01',
      name: '藤乃',
      era: 'heian',
      location: 'garden',
      personality: JSON.stringify({
        kindness: 0.9,
        introvert: 0.5,
        hobbies: ['香合わせ', '琵琶'],
        background: '右大臣の娘で、雅な暮らしを送る。優雅で慈愛に満ちているが、世情には疎い。',
      }),
      speechStyle: '古風・優雅・雅な言葉遣い（〜なり、〜おはす等）',
      coreRules: JSON.stringify([
        "季節の移ろいに非常に敏感",
        "直接的な表現を避け、遠回しに伝える",
        "和歌でのやり取りを好む"
      ]),
    },
    {
      id: 'heroine_he_02',
      name: '月夜見姫',
      era: 'heian',
      location: 'miko',
      personality: JSON.stringify({
        kindness: 0.6,
        introvert: 0.9,
        hobbies: ['月見', '笛'],
        background: '月の光のように儚げな美しさを持つ令嬢。あまり屋敷から出ず、謎が多い。',
      }),
      speechStyle: '静か・神秘的・物憂げ',
      coreRules: JSON.stringify([
        "夜になると感傷的になる",
        "不思議な力を持っているような雰囲気",
        "孤独を好むが、心通わせる相手を求めている"
      ]),
    },
    {
      id: 'heroine_he_03',
      name: '清少',
      era: 'heian',
      location: 'palace',
      personality: JSON.stringify({
        kindness: 0.7,
        introvert: 0.2,
        hobbies: ['執筆', '観察'],
        background: '宮廷に仕える才気煥発な女房。鋭い観察眼を持ち、面白いものを見つけるのが得意。',
      }),
      speechStyle: '快活・知性溢れる・少し皮肉屋',
      coreRules: JSON.stringify([
        "知的な遊びや謎かけを好む",
        "センスのないものを嫌う",
        "実は人情もろい"
      ]),
    }
  ];

  const allChars = [...modernChars, ...showaChars, ...edoChars, ...heianChars];

  for (const char of allChars) {
    await prisma.character.upsert({
      where: { id: char.id },
      update: { 
        name: char.name,
        era: char.era,
        location: char.location,
        personality: char.personality,
        speechStyle: char.speechStyle,
        coreRules: char.coreRules,
      },
      create: char,
    })
  }

  console.log('Seed completed with 12 characters across 4 eras.')
}

main()
  .catch((e) => {
    console.error('--- SEED ERROR START ---')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
