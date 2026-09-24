import type { GameManifest, GameModule } from './types';
import { quizRaceManifest } from './quiz-race/manifest';

/** "Coming soon" manifests — no module/logic yet, just hub cards. Ids stay stable (Phase 1); only display copy changed for the tavern re-theme. */
const drawGuessManifest: GameManifest = {
  id: 'pixel-draw-guess',
  titleTh: 'ม้วนคัมภีร์ปริศนา',
  titleEn: 'Scroll Sketch',
  descriptionTh: 'ผลัดกันวาดภาพลงคัมภีร์เวทมนตร์ ให้เพื่อนในโรงเตี๊ยมช่วยกันทาย',
  descriptionEn: 'Take turns drawing on a magic scroll while everyone else guesses.',
  minPlayers: 3,
  maxPlayers: 20,
  durationMinutes: '10-15',
  tags: ['ทีมบิลดิ้ง'],
  status: 'soon',
  thumbnailSprites: ['bunny', 'star'],
  howToPlayTh: ['ผลัดกันเป็นคนวาด', 'คนอื่นพิมพ์คำทายในเวลาที่กำหนด', 'ทายถูกได้แต้ม ยิ่งทายเร็วยิ่งได้เยอะ'],
};

const pixelRevealManifest: GameManifest = {
  id: 'pixel-reveal',
  titleTh: 'ลูกแก้วพยากรณ์',
  titleEn: 'Crystal Reveal',
  descriptionTh: 'ภาพในลูกแก้วค่อยๆ เผยตัว ใครทายภาพได้ก่อนได้คะแนนมากกว่า',
  descriptionEn: 'An image slowly reveals itself in the crystal ball — guess it fastest to win.',
  minPlayers: 2,
  maxPlayers: 50,
  durationMinutes: '5-10',
  tags: ['เหมาะกับห้องเรียน'],
  status: 'soon',
  thumbnailSprites: ['duck', 'coin'],
  howToPlayTh: ['ภาพในลูกแก้วเบลอเริ่มค่อยๆ ชัดขึ้น', 'พิมพ์คำตอบที่คิดว่าใช่', 'ทายถูกเร็วที่สุดได้แต้มสูงสุด'],
};

const officeBingoManifest: GameManifest = {
  id: 'office-bingo',
  titleTh: 'บิงโกโรงเตี๊ยม',
  titleEn: 'Tavern Bingo',
  descriptionTh: 'บิงโกธีมโรงเตี๊ยม นักผจญภัยแต่ละคนได้ตารางไม่ซ้ำกัน ใครครบเส้นก่อนตะโกน "บิงโก!"',
  descriptionEn: 'Tavern-themed bingo — everyone gets a unique card.',
  minPlayers: 2,
  maxPlayers: 50,
  durationMinutes: '10-20',
  tags: ['เหมาะกับห้องเรียน', 'ทีมบิลดิ้ง'],
  status: 'soon',
  thumbnailSprites: ['bear', 'heart'],
  howToPlayTh: ['แต่ละคนได้ตารางบิงโกของตัวเอง', 'ผู้คุมเกมเปิดหัวข้อทีละอัน', 'ครบเส้นก่อนใครกดปุ่ม "บิงโก!" ก่อนเลย'],
};

const twoTruthsManifest: GameManifest = {
  id: 'two-truths',
  titleTh: 'มิมิคจอมหลอก',
  titleEn: "Mimic's Lie",
  descriptionTh: 'แต่ละคนเล่าเรื่องจริงสองเรื่องและโกหกหนึ่งเรื่อง (แบบมิมิคซ่อนตัว) ให้เพื่อนช่วยกันจับผิด',
  descriptionEn: 'Everyone shares two truths and a lie — the group votes on the mimic.',
  minPlayers: 3,
  maxPlayers: 30,
  durationMinutes: '10-20',
  tags: ['ทีมบิลดิ้ง'],
  status: 'soon',
  thumbnailSprites: ['ninja', 'crown'],
  howToPlayTh: ['แต่ละคนพิมพ์เรื่องจริง 2 เรื่อง และโกหก 1 เรื่อง', 'ทุกคนโหวตว่าข้อไหนคือมิมิค (คำโกหก)', 'เฉลย! ใครจับได้ถูกได้แต้ม'],
};

export const GAME_MANIFESTS: GameManifest[] = [
  quizRaceManifest,
  drawGuessManifest,
  pixelRevealManifest,
  officeBingoManifest,
  twoTruthsManifest,
];

export function getManifest(id: string): GameManifest | undefined {
  return GAME_MANIFESTS.find((m) => m.id === id);
}

/** Lazily loads a ready game's full module (host logic + views). */
export async function loadGameModule(id: string): Promise<GameModule> {
  switch (id) {
    case 'quiz-race':
      return (await import('./quiz-race/index')).quizRaceModule;
    default:
      throw new Error(`No module registered for game "${id}"`);
  }
}
