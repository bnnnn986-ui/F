import { ITEMS, type ItemId } from '../sprites/items';

export function ItemSprite({ id, size = 32, className = '' }: { id: ItemId; size?: number; className?: string }) {
  return <img src={ITEMS[id]} width={size} height={size} alt="" draggable={false} className={className} />;
}
