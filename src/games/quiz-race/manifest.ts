import type { GameManifest } from '../types';

export const quizRaceManifest: GameManifest = {
  id: 'quiz-race',
  titleTh: 'ควิซวิ่งแข่ง',
  titleEn: 'Quiz Race',
  descriptionTh: 'ตอบคำถามให้เร็วและถูกต้อง เพื่อวิ่งพาตัวละครพิกเซลของคุณไปให้ถึงเส้นชัยก่อนใคร',
  descriptionEn: 'Kahoot-style quiz — every correct answer moves your runner forward.',
  minPlayers: 1,
  maxPlayers: 50,
  durationMinutes: '5-10',
  tags: ['เหมาะกับห้องเรียน', 'ทีมบิลดิ้ง'],
  status: 'ready',
  thumbnailSprites: ['cat', 'flag', 'trophy'],
  howToPlayTh: [
    'โฮสต์กดสร้างห้อง แล้วให้ผู้เล่นสแกน QR หรือกรอกรหัสห้อง',
    'เมื่อคำถามขึ้นจอ ผู้เล่นแตะคำตอบที่ถูกต้องให้เร็วที่สุดบนมือถือ',
    'ตอบถูกได้คะแนน ตัววิ่งพิกเซลของคุณจะวิ่งไปข้างหน้า ใครถึงเส้นชัยก่อนชนะ!',
  ],
};
