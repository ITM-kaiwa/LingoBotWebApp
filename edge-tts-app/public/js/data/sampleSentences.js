// Multilingual practice sentences library for Microsoft Edge TTS & Web Speech API

export const SAMPLE_CATEGORIES = [
  { id: 'all', name: '✨ すべて (All Categories)' },
  { id: 'en-business', name: '🇺🇸 Business English' },
  { id: 'en-daily', name: '💬 Daily Conversation' },
  { id: 'ja-daily', name: '🇯🇵 日本語会話 (Japanese)' },
  { id: 'vi-daily', name: '🇻🇳 Tiếng Việt (Vietnamese)' }
];

export const SAMPLE_SENTENCES = [
  // English Business
  {
    id: 1,
    category: 'en-business',
    lang: 'en-US',
    text: "We need to optimize our workflow to deliver the project on schedule.",
    phonetic: "wiː niːd tuː ˈɒptɪmaɪz ˈaʊə ˈwɜːkfləʊ tuː dɪˈlɪvə ðə ˈprɒdʒɛkt ɒn ˈʃɛdjuːl",
    translation: "スケジュール通りにプロジェクトを推進するためにワークフローを最適化する必要があります。",
    difficulty: "Intermediate"
  },
  {
    id: 2,
    category: 'en-business',
    lang: 'en-US',
    text: "Innovating rapidly gives our company a distinct competitive advantage in the global market.",
    phonetic: "ˈɪnəveɪtɪŋ ˈræpɪdli ɡɪvz ˈaʊə ˈkʌmpəni ə dɪsˈtɪŋkt kəmˈpɛtɪtɪv ədˈvɑːntɪdʒ",
    translation: "迅速なイノベーションはグローバル市場において当社に明確な競合優位性をもたらします。",
    difficulty: "Advanced"
  },

  // English Daily
  {
    id: 3,
    category: 'en-daily',
    lang: 'en-US',
    text: "Could you please tell me where the nearest coffee shop is located?",
    phonetic: "kʊd juː pliːz tɛl miː weə ðə ˈnɪərɪst ˈkɒfi ʃɒp ɪz ləʊˈkeɪtɪd",
    translation: "一番近くのコーヒーショップがどこにあるか教えていただけますか？",
    difficulty: "Beginner"
  },
  {
    id: 4,
    category: 'en-daily',
    lang: 'en-US',
    text: "That sounds like a wonderful idea! Let's get together this Friday evening.",
    phonetic: "ðæt saʊndz laɪk ə ˈwʌndəfʊl aɪˈdɪə! lɛts ɡɛt təˈɡɛðə ðɪs ˈfraɪdeɪ ˈiːvnɪŋ",
    translation: "素晴らしいアイデアですね！今週の金曜の夜に集まりましょう。",
    difficulty: "Intermediate"
  },

  // Japanese Daily
  {
    id: 5,
    category: 'ja-daily',
    lang: 'ja-JP',
    text: "Microsoft Edgeの無料ニューラル音声（Nanamiボイス）を活用して、自然なスピーキング練習を行いましょう。",
    phonetic: "みくろそふと えっじの むりょう にゅーらる おんせい を かつようして、しぜんな すぴーきんぐ れんしゅう を おこないましょう。",
    translation: "Let's practice natural speaking using Microsoft Edge free neural voices.",
    difficulty: "Intermediate"
  },
  {
    id: 6,
    category: 'ja-daily',
    lang: 'ja-JP',
    text: "本日もお疲れ様でした。明日のミーティングの議題を事前に共有しておきますね。",
    phonetic: "ほんじつ も おつかれさま でした。 あしたの みーてぃんぐ の ぎだい を じぜんに きょうゆう しておきますね。",
    translation: "Thank you for your hard work today. I will share tomorrow's meeting agenda in advance.",
    difficulty: "Beginner"
  },

  // Vietnamese Daily
  {
    id: 7,
    category: 'vi-daily',
    lang: 'vi-VN',
    text: "Công nghệ giọng nói Microsoft Edge TTS mang lại âm thanh vô cùng tự nhiên và mượt mà.",
    phonetic: "Cong nghe giong noi Microsoft Edge TTS mang lai am thanh vo cung tu nhien va muot ma",
    translation: "Microsoft Edge TTS voice technology delivers extremely natural and smooth audio.",
    difficulty: "Intermediate"
  },
  {
    id: 8,
    category: 'vi-daily',
    lang: 'vi-VN',
    text: "Xin chào! Bạn có muốn cùng tôi luyện tập giao tiếp hàng ngày bằng giọng đọc Hoài Mỹ không?",
    phonetic: "Xin chao! Ban co muon cung toi luyen tap giao tiep hang ngay bang giong doc Hoai My khong?",
    translation: "Hello! Would you like to practice daily communication with me using Hoài Mỹ voice?",
    difficulty: "Beginner"
  }
];
