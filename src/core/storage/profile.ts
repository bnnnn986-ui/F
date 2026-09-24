import { getJSON, setJSON } from './storage';
import { randomAvatarId } from '../sprites/avatars';

export interface PlayerProfile {
  name: string;
  avatarId: string;
}

const KEY = 'pp:profile';

export function loadProfile(): PlayerProfile {
  return getJSON<PlayerProfile>(KEY, { name: '', avatarId: randomAvatarId() });
}

export function saveProfile(profile: PlayerProfile): void {
  setJSON(KEY, profile);
}
