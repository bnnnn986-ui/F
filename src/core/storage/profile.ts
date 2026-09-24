import { getJSON, setJSON } from './storage';
import { randomHeroId } from '../sprites/heroes';

export interface PlayerProfile {
  name: string;
  avatarId: string;
  tint: number;
}

const KEY = 'pp:profile';

export function loadProfile(): PlayerProfile {
  return getJSON<PlayerProfile>(KEY, { name: '', avatarId: randomHeroId(), tint: 0 });
}

export function saveProfile(profile: PlayerProfile): void {
  setJSON(KEY, profile);
}
