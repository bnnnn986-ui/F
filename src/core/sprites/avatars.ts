import { addEyes, addFeet, addSmile, buildBody, paintPixels, toStrings, type EyeStyle } from './avatarBuilder';

export interface AvatarDef {
  id: string;
  nameTh: string;
  nameEn: string;
  idle: string[][]; // 2 frames, each a 16-row string array
  run: string[][];
}

interface CritterSpec {
  id: string;
  nameTh: string;
  nameEn: string;
  bodyColor: string;
  shadeColor: string;
  footColor: string;
  eyeStyle?: EyeStyle;
  profile?: number[];
  /** extra pixels drawn on top, e.g. ears/horn/antenna. [x, y, colorKey] */
  feature?: Array<[number, number, string]>;
  smile?: boolean;
}

const SPECS: CritterSpec[] = [
  {
    id: 'cat',
    nameTh: 'แมว',
    nameEn: 'Cat',
    bodyColor: 'o',
    shadeColor: 'Y',
    footColor: 'k',
    feature: [
      [4, 0, 'o'], [5, 1, 'o'], [4, 1, 'k'],
      [11, 0, 'o'], [10, 1, 'o'], [11, 1, 'k'],
    ],
    smile: true,
  },
  {
    id: 'dog',
    nameTh: 'หมา',
    nameEn: 'Dog',
    bodyColor: 'b',
    shadeColor: 'd',
    footColor: 'k',
    feature: [
      [3, 1, 'd'], [3, 2, 'd'], [4, 2, 'd'],
      [12, 1, 'd'], [12, 2, 'd'], [11, 2, 'd'],
    ],
    smile: true,
  },
  {
    id: 'frog',
    nameTh: 'กบ',
    nameEn: 'Frog',
    bodyColor: 'e',
    shadeColor: 'E',
    footColor: 'E',
    eyeStyle: 'wide',
    feature: [
      [4, 0, 'e'], [5, 0, 'k'], [10, 0, 'e'], [11, 0, 'k'],
    ],
  },
  {
    id: 'panda',
    nameTh: 'แพนด้า',
    nameEn: 'Panda',
    bodyColor: 'w',
    shadeColor: 'g',
    footColor: 'k',
    feature: [
      [3, 0, 'k'], [4, 0, 'k'], [3, 1, 'k'],
      [12, 0, 'k'], [11, 0, 'k'], [12, 1, 'k'],
    ],
    smile: true,
  },
  {
    id: 'ghost',
    nameTh: 'ผี',
    nameEn: 'Ghost',
    bodyColor: 'w',
    shadeColor: 'g',
    footColor: 'w',
    eyeStyle: 'round',
  },
  {
    id: 'knight',
    nameTh: 'อัศวิน',
    nameEn: 'Knight',
    bodyColor: 'g',
    shadeColor: 'C',
    footColor: 'k',
    feature: [
      [6, 0, 'y'], [7, 0, 'y'], [8, 0, 'y'], [9, 0, 'y'],
      [7, -1 + 1, 'r'],
    ],
  },
  {
    id: 'ninja',
    nameTh: 'นินจา',
    nameEn: 'Ninja',
    bodyColor: 'n',
    shadeColor: 'k',
    footColor: 'k',
    eyeStyle: 'blink',
    feature: [
      [5, 1, 'x'], [6, 1, 'x'], [9, 1, 'x'], [10, 1, 'x'],
    ],
  },
  {
    id: 'bear',
    nameTh: 'หมี',
    nameEn: 'Bear',
    bodyColor: 'd',
    shadeColor: 'b',
    footColor: 'k',
    feature: [
      [3, 0, 'd'], [12, 0, 'd'],
    ],
    smile: true,
  },
  {
    id: 'bunny',
    nameTh: 'กระต่าย',
    nameEn: 'Bunny',
    bodyColor: 'w',
    shadeColor: 'g',
    footColor: 'p',
    feature: [
      [5, -3 + 1, 'w'], [5, -2 + 1, 'w'], [5, -1 + 1, 'w'], [5, 0, 'w'],
      [10, -3 + 1, 'w'], [10, -2 + 1, 'w'], [10, -1 + 1, 'w'], [10, 0, 'w'],
      [5, -2 + 1, 'p'], [10, -2 + 1, 'p'],
    ],
    smile: true,
  },
  {
    id: 'alien',
    nameTh: 'เอเลี่ยน',
    nameEn: 'Alien',
    bodyColor: 'u',
    shadeColor: 'U',
    footColor: 'U',
    eyeStyle: 'wide',
    profile: [7, 4, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 3, 4],
  },
  {
    id: 'duck',
    nameTh: 'เป็ด',
    nameEn: 'Duck',
    bodyColor: 'y',
    shadeColor: 'Y',
    footColor: 'o',
    feature: [
      [6, 8, 'o'], [7, 8, 'o'], [8, 8, 'o'], [9, 8, 'o'],
    ],
  },
  {
    id: 'slime',
    nameTh: 'สไลม์',
    nameEn: 'Slime',
    bodyColor: 'm',
    shadeColor: 'E',
    footColor: 'E',
    profile: [8, 8, 6, 4, 2, 1, 1, 1, 1, 1, 1, 2, 4, 6],
    smile: true,
  },
];

function buildCritter(spec: CritterSpec): AvatarDef {
  const base = () => {
    let g = buildBody({ bodyColor: spec.bodyColor, shadeColor: spec.shadeColor, profile: spec.profile });
    if (spec.feature) g = paintPixels(g, spec.feature as Array<[number, number, string]>);
    return g;
  };

  const withFace = (g: ReturnType<typeof buildBody>, eyes: EyeStyle) => {
    let out = addEyes(g, eyes);
    if (spec.smile) out = addSmile(out);
    return out;
  };

  const idleOpen = withFace(base(), spec.eyeStyle ?? 'round');
  const idleBlink = withFace(base(), 'blink');
  const runOpenA = withFace(base(), spec.eyeStyle ?? 'round');
  const runOpenB = withFace(base(), spec.eyeStyle ?? 'round');

  return {
    id: spec.id,
    nameTh: spec.nameTh,
    nameEn: spec.nameEn,
    idle: [
      toStrings(addFeet(idleOpen, spec.footColor, 'idle')),
      toStrings(addFeet(idleBlink, spec.footColor, 'idle')),
    ],
    run: [
      toStrings(addFeet(runOpenA, spec.footColor, 'runA')),
      toStrings(addFeet(runOpenB, spec.footColor, 'runB')),
    ],
  };
}

export const AVATARS: AvatarDef[] = SPECS.map(buildCritter);

export function getAvatar(id: string): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]!;
}

export function randomAvatarId(): string {
  const a = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  return a ? a.id : 'cat';
}
