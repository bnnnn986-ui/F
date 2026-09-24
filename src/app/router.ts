import { useEffect, useState } from 'preact/hooks';

export type Route =
  | { name: 'hub' }
  | { name: 'partyHost'; preselectGameId?: string }
  | { name: 'join'; code?: string }
  | { name: 'partyPlay' };

function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  const parts = (path ?? '').split('/').filter(Boolean);
  const params = new URLSearchParams(query ?? '');

  if (parts.length === 0) return { name: 'hub' };
  if (parts[0] === 'party' && parts[1] === 'host') {
    const preselectGameId = params.get('game') ?? undefined;
    return { name: 'partyHost', preselectGameId };
  }
  if (parts[0] === 'party' && parts[1] === 'play') return { name: 'partyPlay' };
  if (parts[0] === 'join') return { name: 'join', code: parts[1] ? decodeURIComponent(parts[1]) : undefined };
  return { name: 'hub' };
}

export function navigate(path: string): void {
  window.location.hash = path.startsWith('#') ? path : `#${path}`;
}

/** Reads and subscribes to the current hash route. GitHub-Pages safe (no server routing needed). */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}
