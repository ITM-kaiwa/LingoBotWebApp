// Sample Practice Sentences categorized by topic and language

export const SAMPLE_CATEGORIES = [
  { id: 'all', name: '✨ All Categories' },
  { id: 'business', name: '💼 Business & Work' },
  { id: 'daily', name: '🗣 Daily Conversation' },
  { id: 'travel', name: '✈️ Travel & Social' },
  { id: 'tech', name: '💻 Technology & AI' },
  { id: 'japanese', name: '🌸 日本語 (Japanese)' }
];

export const SAMPLE_SENTENCES = [
  // Business & Work
  {
    id: 1,
    category: 'business',
    lang: 'en-US',
    text: "We need to optimize our workflow to deliver the project on schedule.",
    phonetic: "/wiː niːd tuː ˈɒptɪmaɪz ˈaʊə ˈwɜːkfləʊ tuː dɪˈlɪvə ðə ˈprɒdʒɛkt ɒn ˈʃɛdjuːl/",
    translation: "スケジュール通りにプロジェクトを推進するためにワークフローを最適化する必要があります。",
    difficulty: "Intermediate"
  },
  {
    id: 2,
    category: 'business',
    lang: 'en-US',
    text: "Thank you for joining today's conference call. Let's review the quarterly results.",
    phonetic: "/θæŋk juː fɔː ˈdʒɔɪnɪŋ təˈdeɪz ˈkɒnfərəns kɔːl/ /lɛts rɪˈvjuː ðə ˈkwɔːtəli rɪˈzʌlts/",
    translation: "本日の電話会議にご参加いただきありがとうございます。四半期業績を確認しましょう。",
    difficulty: "Beginner"
  },
  {
    id: 3,
    category: 'business',
    lang: 'en-US',
    text: "Innovating rapidly gives our company a distinct competitive advantage in the global market.",
    phonetic: "/ˈɪnəveɪtɪŋ ˈræpɪdli ɡɪvz ˈaʊə ˈkʌmpəni ə dɪsˈtɪŋkt kəmˈpɛtɪtɪv ədˈvɑːntɪdʒ/",
    translation: "迅速なイノベーションはグローバル市場において当社に明確な競合優位性をもたらします。",
    difficulty: "Advanced"
  },

  // Daily Conversation
  {
    id: 4,
    category: 'daily',
    lang: 'en-US',
    text: "Could you please tell me where the nearest coffee shop is located?",
    phonetic: "/kʊd juː pliːz tɛl miː weə ðə ˈnɪərɪst ˈkɒfi ʃɒp ɪz ləʊˈkeɪtɪd/",
    translation: "一番近くのコーヒーショップがどこにあるか教えていただけますか？",
    difficulty: "Beginner"
  },
  {
    id: 5,
    category: 'daily',
    lang: 'en-US',
    text: "I really enjoy spending my weekends hiking in the mountains and reading books.",
    phonetic: "/aɪ ˈrɪəli ɪnˈdʒɔɪ ˈspɛndɪŋ maɪ ˈwiːkɛndz ˈhaɪkɪŋ ɪn ðə ˈmaʊntɪnz/",
    translation: "週末に山へハイキングに行ったり読書をしたりするのが本当に好きです。",
    difficulty: "Beginner"
  },
  {
    id: 6,
    category: 'daily',
    lang: 'en-US',
    text: "That sounds like a wonderful idea! Let's get together this Friday evening.",
    phonetic: "/ðæt saʊndz laɪk ə ˈwʌndəfʊl aɪˈdɪə! lɛts ɡɛt təˈɡɛðə ðɪs ˈfraɪdeɪ ˈiːvnɪŋ/",
    translation: "素晴らしいアイデアですね！今週の金曜の夜に集まりましょう。",
    difficulty: "Intermediate"
  },

  // Travel & Social
  {
    id: 7,
    category: 'travel',
    lang: 'en-US',
    text: "Excuse me, does this train go directly to the international airport?",
    phonetic: "/ɪkˈskjuːs miː, dʌz ðɪs treɪn ɡəʊ dɪˈrɛktli tuː ðə ˌɪntəˈnæʃnəl ˈeəpɔːt/",
    translation: "すみません、この電車は国際空港へ直行しますか？",
    difficulty: "Beginner"
  },
  {
    id: 8,
    category: 'travel',
    lang: 'en-US',
    text: "I would like to reserve a table for two near the window for eight o'clock.",
    phonetic: "/aɪ wʊd laɪk tuː rɪˈzɜːv ə ˈteɪbl fɔː tuː nɪə ðə ˈwɪndəʊ fɔː eɪt əˈklɒk/",
    translation: "8時に窓側の2人席を予約したいのですが。",
    difficulty: "Intermediate"
  },

  // Tech & AI
  {
    id: 9,
    category: 'tech',
    lang: 'en-US',
    text: "Artificial intelligence is transforming how human beings communicate and process information.",
    phonetic: "/ˌɑːtɪˈfɪʃəl ɪnˈtɛlɪdʒəns ɪz trænsˈfɔːmɪŋ haʊ ˈhjuːmən ˈbiːɪŋz kəˈmjuːnɪkeɪt/",
    translation: "人工知能は人類のコミュニケーションや情報処理のあり方を変化させています。",
    difficulty: "Advanced"
  },
  {
    id: 10,
    category: 'tech',
    lang: 'en-US',
    text: "Neural text-to-speech technology synthesizes natural and human-like voice audio.",
    phonetic: "/ˈnjʊərəl tɛkst tuː spiːtʃ tɛkˈnɒlədʒi ˈsɪnθɪsaɪzɪz ˈnætʃrəl ˈvɔɪs ˈɔːdɪəʊ/",
    translation: "ニューラルText-to-Speech技術は自然で人間らしい音声オーディオを合成します。",
    difficulty: "Advanced"
  },

  // Japanese Sentences
  {
    id: 11,
    category: 'japanese',
    lang: 'ja-JP',
    text: "最新のニューラル音声AIを活用して、自然なスピーキング練習を行いましょう。",
    phonetic: "さいしんの にゅーらる おんせい AI を かつようして、しぜんな すぴーきんぐ れんしゅう を おこないましょう。",
    translation: "Let's practice natural speaking using state-of-the-art neural voice AI.",
    difficulty: "Intermediate"
  },
  {
    id: 12,
    category: 'japanese',
    lang: 'ja-JP',
    text: "本日のWeb Speech APIとGoogle Cloud Neural2の連携は非常に円滑です。",
    phonetic: "ほんじつの Web Speech API と Google Cloud Neural2 の れんけい は ひじょうに えんかつ です。",
    translation: "Today's integration of Web Speech API and Google Cloud Neural2 is very smooth.",
    difficulty: "Advanced"
  }
];
