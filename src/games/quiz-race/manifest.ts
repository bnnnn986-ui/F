import type { GameManifest } from '../types';

export const quizRaceManifest: GameManifest = {
  id: 'quiz-race',
  titleTh: 'ดันเจี้ยนแดช',
  titleEn: 'Dungeon Dash',
  descriptionTh: 'ตอบคำถามให้เร็วและถูกต้อง เพื่อวิ่งพานักผจญภัยของคุณลัดเลาะดันเจี้ยนไปถึงหีบสมบัติก่อนใคร',
  descriptionEn: 'Kahoot-style quiz — every correct answer dashes your hero through the dungeon.',
  minPlayers: 1,
  maxPlayers: 50,
  durationMinutes: '5-10',
  tags: ['เหมาะกับห้องเรียน', 'ทีมบิลดิ้ง'],
  status: 'ready',
  thumbnailSprites: ['fighter', 'ranger', 'treasure-chest'],
  howToPlayTh: [
    'ผู้คุมเกม (GM) กดสร้างโรงเตี๊ยม แล้วให้นักผจญภัยสแกน QR หรือกรอกรหัสห้อง',
    'เมื่อคำถามขึ้นจอ นักผจญภัยแตะคำตอบที่ถูกต้องให้เร็วที่สุดบนมือถือ',
    'ตอบถูกได้คะแนน ฮีโร่ของคุณจะวิ่งลัดดันเจี้ยนไปข้างหน้า ใครถึงหีบสมบัติก่อนชนะ!',
  ],
};
