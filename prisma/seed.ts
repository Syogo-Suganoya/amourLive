import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const misaki = await prisma.character.upsert({
    where: { id: 'heroine_01' },
    update: {},
    create: {
      id: 'heroine_01',
      name: '美咲',
      personality: JSON.stringify({
        kindness: 0.8,
        introvert: 0.6,
        hobbies: ['琥珀糖作り', '古い喫茶店巡り'],
        background: '物静かだが芯の強い大学生。',
      }),
      speechStyle: '丁寧・距離感あり',
      coreRules: JSON.stringify([
        "信頼が低いと本音を話さない",
        "敬語の崩しに敏感",
        "雨の日は少し憂鬱"
      ]),
    },
  })

  // テスト用ユーザーの作成
  const testUser = await prisma.user.upsert({
    where: { id: 'test-user-id' },
    update: {},
    create: {
      id: 'test-user-id',
      name: 'ユーザー',
    },
  })

  // ユーザーとキャラクターの紐付け
  await prisma.userCharacter.upsert({
    where: {
      userId_characterId: {
        userId: testUser.id,
        characterId: misaki.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      characterId: misaki.id,
      state: {
        create: {
          affection: 10,
          trust: 5,
          relationshipStage: 'stranger',
          flags: JSON.stringify({
            date_done: false,
          }),
        },
      },
    },
  })

  console.log('Seed completed.')
}

main()
  .catch((e) => {
    console.error('--- SEED ERROR START ---')
    console.error(e)
    if (e instanceof Error) {
      console.error('Message:', e.message)
      console.error('Stack:', e.stack)
    }
    console.dir(e, { depth: null })
    console.error('--- SEED ERROR END ---')
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
