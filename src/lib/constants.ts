export const ERA_CONFIG_DATA: Record<string, {
  label: string;
  locations: string[];
  locationLabels: Record<string, string>;
  contactLabel: string;
  messagingLabel: string;
}> = {
  modern: {
    label: "現代",
    locations: ["cafe", "park", "library", "aquarium", "rooftop", "riverbank"],
    locationLabels: { 
      cafe: "街角のカフェ", 
      park: "セントラルパーク", 
      library: "公立図書館",
      aquarium: "サンセット水族館",
      rooftop: "展望スカイテラス",
      riverbank: "川べりの遊歩道"
    },
    contactLabel: "連絡先リスト",
    messagingLabel: "LIME",
  },
  showa: {
    label: "昭和",
    locations: ["kissaten", "school", "shopping_street", "cinema", "sento", "rooftop_park"],
    locationLabels: { 
      kissaten: "純喫茶ひだまり", 
      school: "放課後の学校", 
      shopping_street: "夕暮れの商店街",
      cinema: "銀星座（映画館）",
      sento: "松の湯（銭湯）",
      rooftop_park: "デパートの屋上遊園地"
    },
    contactLabel: "連絡先帳",
    messagingLabel: "伝言",
  },
  edo: {
    label: "江戸時代",
    locations: ["chaya", "yokochou", "temple", "river", "shibai", "matsuri"],
    locationLabels: { 
      chaya: "峠の茶屋", 
      yokochou: "夜の横丁", 
      temple: "静かな古寺",
      river: "隅田川の渡し舟",
      shibai: "芝居小屋",
      matsuri: "祭りの境内"
    },
    contactLabel: "交友録",
    messagingLabel: "文",
  },
  heian: {
    label: "平安時代",
    locations: ["garden", "miko", "palace", "waterfall", "mansion", "pavilion"],
    locationLabels: { 
      garden: "寝殿の庭園", 
      miko: "神秘的な社", 
      palace: "平安の宮中",
      waterfall: "清涼の滝",
      mansion: "六条河原院（邸宅）",
      pavilion: "月見の釣殿"
    },
    contactLabel: "文箱",
    messagingLabel: "御文",
  }
};

export const SEASONAL_EVENTS: Record<string, Record<string, { id: string, label: string }>> = {
  modern: {
    spring: { id: "sp_hanami", label: "🌸 桜まつり（お花見広場）" },
    summer: { id: "su_hanabi", label: "🎆 花火大会の会場" },
    autumn: { id: "au_ichou", label: "🍂 紅葉色づくイチョウ並木" },
    winter: { id: "wi_illumi", label: "❄️ ウィンターイルミネーション広場" }
  },
  showa: {
    spring: { id: "sp_hanami", label: "🌸 桜まつり（お花見広場）" },
    summer: { id: "su_hanabi", label: "🎆 縁日・花火大会" },
    autumn: { id: "au_ichou", label: "🍂 秋のイチョウ並木" },
    winter: { id: "wi_illumi", label: "❄️ ウィンターイルミネーション" }
  },
  edo: {
    spring: { id: "sp_hanami_edo", label: "🌸 桜の名所（飛鳥山）" },
    summer: { id: "su_matsuri", label: "🏮 盆踊り・夏祭り" },
    autumn: { id: "au_tsukimi", label: "🌕 お月見の茶屋" },
    winter: { id: "wi_yuki", label: "❄️ 雪景色の神社（初詣）" }
  },
  heian: {
    spring: { id: "sp_hanami_heian", label: "🌸 花の宴（桜咲く庭園）" },
    summer: { id: "su_tanabata", label: "🎋 七夕の祭壇・蛍狩り" },
    autumn: { id: "au_kangetsu", label: "🌕 観月の宴・菊の節句" },
    winter: { id: "wi_yukimi", label: "❄️ 雪化粧した社・雪見の宴" }
  }
};

export function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}
