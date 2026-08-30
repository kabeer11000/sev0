import { useEffect, useState } from 'react'

export type Route = { type: 'list' } | { type: 'incident'; caseId: string }

export function parseRoute(pathname: string): Route {
  const m = pathname.match(/^\/incident\/([^/]+)\/?$/)
  if (m) return { type: 'incident', caseId: decodeURIComponent(m[1]) }
  return { type: 'list' }
}

function currentRoute(): Route {
  return parseRoute(typeof location !== 'undefined' ? location.pathname : '/')
}

export function navigate(path: string) {
  if (location.pathname === path) return
  history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => currentRoute())
  useEffect(() => {
    const onPop = () => setRoute(currentRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return route
}
