import { useCallback, useEffect, useState } from 'react';
import { isSafeId } from '../lib/validation/sanitize';

export type Route =
  | { name: 'home' }
  | { name: 'all' }
  | { name: 'favorites' }
  | { name: 'category'; id: string };

/** Hash routing keeps the app deployable on static hosts such as GitHub Pages. */
export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '');
  if (path === '/all') return { name: 'all' };
  if (path === '/favorites') return { name: 'favorites' };
  const match = /^\/c\/([^/?#]+)$/.exec(path);
  if (match) {
    let id = match[1];
    try {
      id = decodeURIComponent(id);
    } catch {
      return { name: 'home' };
    }
    if (isSafeId(id)) return { name: 'category', id };
  }
  return { name: 'home' };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'all':
      return '#/all';
    case 'favorites':
      return '#/favorites';
    case 'category':
      return `#/c/${encodeURIComponent(route.id)}`;
    default:
      return '#/';
  }
}

export function routeKey(route: Route): string {
  return route.name === 'category' ? `category:${route.id}` : route.name;
}

export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    const hash = routeToHash(next);
    if (window.location.hash === hash || (hash === '#/' && window.location.hash === '')) {
      setRoute(next);
      return;
    }
    window.location.hash = hash;
  }, []);

  return [route, navigate];
}
