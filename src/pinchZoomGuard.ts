// Blocks browser pinch-to-zoom (trackpads report it as wheel + ctrlKey;
// Safari also fires gesture* events) everywhere except inside an element
// carrying data-allow-pinch-zoom — the topology canvas owns its own
// wheel-driven zoom and wants pinch left alone.
const ALLOW_SELECTOR = '[data-allow-pinch-zoom]'

function isInsideAllowedArea(target: EventTarget | null): boolean {
  return target instanceof Element ? target.closest(ALLOW_SELECTOR) !== null : false
}

export function installPinchZoomGuard() {
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey && !isInsideAllowedArea(e.target)) e.preventDefault()
  }
  const onGesture = (e: Event) => {
    if (!isInsideAllowedArea(e.target)) e.preventDefault()
  }

  // capture, not bubble: Monaco's editor (and other scroll containers) can
  // stop propagation of wheel events for its own scrolling, which would
  // otherwise hide ctrl+wheel from a listener attached at the bubble phase.
  // Capture always runs first, so preventDefault() lands on the event
  // before anything downstream gets a chance to swallow it.
  window.addEventListener('wheel', onWheel, { passive: false, capture: true })
  // gesturestart/change/end are Safari-only, non-standard — no TS lib types
  window.addEventListener('gesturestart', onGesture as EventListener, { capture: true })
  window.addEventListener('gesturechange', onGesture as EventListener, { capture: true })
}
