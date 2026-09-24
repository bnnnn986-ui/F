/** Unambiguous alphabet: no 0/O, 1/I to avoid misreads on a projector. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;
export const PEER_PREFIX = 'pixelparty-v1-';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  return new RegExp(`^[${ALPHABET}]{${ROOM_CODE_LENGTH}}$`).test(code.toUpperCase());
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function roomCodeToPeerId(code: string): string {
  return `${PEER_PREFIX}${code}`;
}

export function peerIdToRoomCode(peerId: string): string | null {
  return peerId.startsWith(PEER_PREFIX) ? peerId.slice(PEER_PREFIX.length) : null;
}
