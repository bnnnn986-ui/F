import { GAME_MANIFESTS } from '../games/registry';
import { GameCard } from '../hub/GameCard';
import { PixelPanel } from '../core/ui/PixelPanel';

export function GamePicker({
  selectedGameId,
  onSelect,
}: {
  selectedGameId: string | null;
  onSelect: (gameId: string) => void;
}) {
  return (
    <PixelPanel>
      <h2>เลือกเกม</h2>
      <div className="hub-grid game-picker__grid">
        {GAME_MANIFESTS.map((manifest) => (
          <div key={manifest.id} className={manifest.id === selectedGameId ? 'game-picker__selected' : ''}>
            <GameCard manifest={manifest} onClick={() => manifest.status === 'ready' && onSelect(manifest.id)} />
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}
