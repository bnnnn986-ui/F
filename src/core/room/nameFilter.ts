/**
 * Small, deliberately simple nickname filter: catches the most common
 * English/Thai profanity plus basic leetspeak/spacing tricks, and swaps a
 * hit for a random fantasy nickname instead of just rejecting it (keeps
 * the join flow friction-free for all ages).
 */

const BANNED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'nigger', 'faggot',
  'เหี้ย', 'สัส', 'ควย', 'เย็ด', 'หี', 'กระหรี่', 'ไอสัตว์',
];

const LEET_MAP: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };

function normalize(input: string): string {
  let s = input.toLowerCase();
  for (const [digit, letter] of Object.entries(LEET_MAP)) s = s.split(digit).join(letter);
  return s.replace(/[\s._\-*]/g, '');
}

export function containsBannedWord(name: string): boolean {
  const normalized = normalize(name);
  return BANNED_WORDS.some((word) => normalized.includes(normalize(word)));
}

const FALLBACK_NAMES = [
  'นักผจญภัยนิรนาม', 'อัศวินไร้นาม', 'จอมเวทลึกลับ', 'นักธนูเงา', 'คนแคระใจดี', 'กวีไร้ชื่อ',
];

export function randomFallbackName(): string {
  return FALLBACK_NAMES[Math.floor(Math.random() * FALLBACK_NAMES.length)] ?? 'นักผจญภัย';
}

/** Returns a safe display name, swapping in a random fantasy name if the input hits the filter. */
export function sanitizeName(name: string): { name: string; wasFiltered: boolean } {
  const trimmed = name.trim().slice(0, 20);
  if (!trimmed || containsBannedWord(trimmed)) {
    return { name: randomFallbackName(), wasFiltered: true };
  }
  return { name: trimmed, wasFiltered: false };
}
