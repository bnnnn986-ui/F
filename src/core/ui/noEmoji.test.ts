import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards the "no emoji, real PixelLab icons only" rule (Phase 4 item 3):
 * scans every .ts/.tsx source file under src/ for emoji/pictograph codepoints
 * in non-comment lines, so a stray emoji can't creep back into UI copy.
 *
 * Comment lines (starting with `//`, `*`, or `/*`) are skipped — a doc
 * comment is allowed to *describe* a symbol it replaces (e.g. "▲ ◆ ● ■
 * replacements") without that counting as a UI-facing emoji.
 */

const SRC_DIR = join(__dirname, '..', '..');

// Supplementary-plane pictographs/emoji, dingbats, misc symbols, arrows,
// geometric shapes commonly used as informal icons, and the emoji
// variation-selector. Deliberately excludes general punctuation (em dash,
// ellipsis, etc.) and ordinary math/currency symbols.
const EMOJI_PATTERN =
  /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{FE0F}]/u;

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function isCommentLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

describe('no emoji in source (use <Icon>/<EmblemIcon>/<PixelShape>/<Chevron> instead)', () => {
  it('has no emoji/pictograph codepoints outside comments', () => {
    const offenders: string[] = [];
    for (const file of listSourceFiles(SRC_DIR)) {
      const lines = readFileSync(file, 'utf-8').split('\n');
      lines.forEach((line, i) => {
        if (isCommentLine(line)) return;
        if (EMOJI_PATTERN.test(line)) {
          offenders.push(`${file.replace(SRC_DIR, 'src')}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders, `Found emoji outside comments:\n${offenders.join('\n')}`).toEqual([]);
  });
});
