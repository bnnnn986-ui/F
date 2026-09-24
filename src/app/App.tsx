import { useRoute } from './router';
import { HubPage } from '../hub/HubPage';
import { PartyHostScreen } from './PartyHostScreen';
import { PartyJoinFlow } from './PartyJoinFlow';
import { PartyPlayScreen } from './PartyPlayScreen';
import { PixelBackground } from '../core/ui/PixelBackground';
import { ToastHost } from '../core/ui/toast';
import '../hub/hub.css';
import '../lobby/lobby.css';

export function App() {
  const route = useRoute();

  return (
    <>
      <PixelBackground />
      {route.name === 'hub' && <HubPage />}
      {route.name === 'partyHost' && <PartyHostScreen preselectGameId={route.preselectGameId} />}
      {route.name === 'join' && <PartyJoinFlow code={route.code} />}
      {route.name === 'partyPlay' && <PartyPlayScreen />}
      <ToastHost />
    </>
  );
}
