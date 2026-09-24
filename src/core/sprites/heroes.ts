/**
 * Player character catalogue: 12 hero classes (primary) + 12 "polymorph"
 * critters (secondary tab, the cute animals from Phase 1). An avatar is
 * `{ base: HeroId | PolymorphId, tint: 0-7 }` — see `recolor.ts` for how
 * tint recolors the PNG at render time, so we never need more art for a
 * big group.
 */

export interface CharacterDef {
  id: string;
  nameTh: string;
  nameEn: string;
  flavourTh: string;
  pngPath: string;
}

export const HEROES: CharacterDef[] = [
  { id: 'fighter', nameTh: 'นักรบ', nameEn: 'Fighter', flavourTh: 'ดาบคู่ใจ ใจกล้าไม่กลัวใคร', pngPath: 'assets/pixellab/heroes/hero-fighter.png' },
  { id: 'wizard', nameTh: 'จอมเวท', nameEn: 'Wizard', flavourTh: 'ท่องคาถาแม่นยำกว่าคำตอบข้อสอบ', pngPath: 'assets/pixellab/heroes/hero-wizard.png' },
  { id: 'rogue', nameTh: 'โจร', nameEn: 'Rogue', flavourTh: 'มือไวใจเร็ว ลอบตอบก่อนใคร', pngPath: 'assets/pixellab/heroes/hero-rogue.png' },
  { id: 'cleric', nameTh: 'นักบวช', nameEn: 'Cleric', flavourTh: 'สวดมนต์ฮีลเพื่อนร่วมทีมได้ (ในใจ)', pngPath: 'assets/pixellab/heroes/hero-cleric.png' },
  { id: 'ranger', nameTh: 'นักธนูเอลฟ์', nameEn: 'Ranger', flavourTh: 'สายตาแม่นยำ เล็งคำตอบไม่พลาด', pngPath: 'assets/pixellab/heroes/hero-ranger.png' },
  { id: 'dwarf', nameTh: 'คนแคระ', nameEn: 'Dwarf', flavourTh: 'ตัวเล็กแต่ใจไม่เล็ก ถือขวานลุยทุกด่าน', pngPath: 'assets/pixellab/heroes/hero-dwarf.png' },
  { id: 'bard', nameTh: 'กวีพเนจร', nameEn: 'Bard', flavourTh: 'ร้องเพลงเชียร์ตัวเองระหว่างวิ่ง', pngPath: 'assets/pixellab/heroes/hero-bard.png' },
  { id: 'barbarian', nameTh: 'คนเถื่อน', nameEn: 'Barbarian', flavourTh: 'พลังดิบ วิ่งแรงไม่มีเบรก', pngPath: 'assets/pixellab/heroes/hero-barbarian.png' },
  { id: 'paladin', nameTh: 'อัศวินศักดิ์สิทธิ์', nameEn: 'Paladin', flavourTh: 'ปกป้องความถูกต้อง (และคะแนน)', pngPath: 'assets/pixellab/heroes/hero-paladin.png' },
  { id: 'druid', nameTh: 'ดรูอิด', nameEn: 'Druid', flavourTh: 'คุยกับต้นไม้รู้เรื่อง คุยกับคำถามก็รู้เรื่อง', pngPath: 'assets/pixellab/heroes/hero-druid.png' },
  { id: 'monk', nameTh: 'นักพรต', nameEn: 'Monk', flavourTh: 'สมาธิแน่วแน่ ตอบไวไร้สั่น', pngPath: 'assets/pixellab/heroes/hero-monk.png' },
  { id: 'warlock', nameTh: 'วอร์ล็อก', nameEn: 'Warlock', flavourTh: 'ทำสัญญาลับกับปีศาจแลกคำตอบถูก', pngPath: 'assets/pixellab/heroes/hero-warlock.png' },
];

export const POLYMORPH: CharacterDef[] = [
  { id: 'cat', nameTh: 'แมว', nameEn: 'Cat', flavourTh: 'ร่างแปลงสุดฟรุ้งฟริ้ง', pngPath: 'assets/pixellab/polymorph/cat.png' },
  { id: 'dog', nameTh: 'หมา', nameEn: 'Dog', flavourTh: 'ซื่อสัตย์ วิ่งเร็ว หางกระดิก', pngPath: 'assets/pixellab/polymorph/dog.png' },
  { id: 'frog', nameTh: 'กบ', nameEn: 'Frog', flavourTh: 'กระโดดไกลกว่าที่คิด', pngPath: 'assets/pixellab/polymorph/frog.png' },
  { id: 'ghost', nameTh: 'ผี', nameEn: 'Ghost', flavourTh: 'น่ารักไม่น่ากลัว สัญญา!', pngPath: 'assets/pixellab/polymorph/ghost.png' },
  { id: 'knight', nameTh: 'อัศวินจิ๋ว', nameEn: 'Knight', flavourTh: 'เกราะเต็มยศ ใจเต็มร้อย', pngPath: 'assets/pixellab/polymorph/knight.png' },
  { id: 'ninja', nameTh: 'นินจา', nameEn: 'Ninja', flavourTh: 'เงียบ ไว จริงจัง(นิดหน่อย)', pngPath: 'assets/pixellab/polymorph/ninja.png' },
  { id: 'bear', nameTh: 'หมี', nameEn: 'Bear', flavourTh: 'กอดได้ กัดไม่ได้', pngPath: 'assets/pixellab/polymorph/bear.png' },
  { id: 'bunny', nameTh: 'กระต่าย', nameEn: 'Bunny', flavourTh: 'หูยาว ใจดี วิ่งกระโดดเก่ง', pngPath: 'assets/pixellab/polymorph/bunny.png' },
  { id: 'alien', nameTh: 'เอเลี่ยน', nameEn: 'Alien', flavourTh: 'มาจากดาวไหนไม่รู้ แต่มาปาร์ตี้ด้วย', pngPath: 'assets/pixellab/polymorph/alien.png' },
  { id: 'duck', nameTh: 'เป็ด', nameEn: 'Duck', flavourTh: 'ก๊าบ! พร้อมลุย', pngPath: 'assets/pixellab/polymorph/duck.png' },
  { id: 'slime', nameTh: 'สไลม์', nameEn: 'Slime', flavourTh: 'นุ่มนิ่มแต่ไม่ยอมแพ้', pngPath: 'assets/pixellab/polymorph/slime.png' },
  { id: 'panda', nameTh: 'แพนด้า', nameEn: 'Panda', flavourTh: 'กินไผ่ ตอบคำถาม สลับกันไป', pngPath: 'assets/pixellab/polymorph/panda.png' },
  { id: 'robot', nameTh: 'หุ่นยนต์', nameEn: 'Robot', flavourTh: 'ประมวลผลคำตอบด้วยความเร็วแสง', pngPath: 'assets/pixellab/polymorph/robot.png' },
];

export const ALL_CHARACTERS: CharacterDef[] = [...HEROES, ...POLYMORPH];

export function getCharacter(id: string): CharacterDef {
  return ALL_CHARACTERS.find((c) => c.id === id) ?? HEROES[0]!;
}

export function isHeroId(id: string): boolean {
  return HEROES.some((h) => h.id === id);
}

export function randomHeroId(): string {
  const h = HEROES[Math.floor(Math.random() * HEROES.length)];
  return h ? h.id : 'fighter';
}
