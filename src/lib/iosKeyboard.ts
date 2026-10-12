/**
 * Workarounds for iOS home-screen web apps where tapping an input focuses it but no keyboard appears
 * (WebKit bugs 235243, 279904). Two known triggers are handled:
 *
 * - The app is suspended with an input focused. On resume WebKit still reports it as focused, so a
 *   tap is not a focus change and the keyboard is never requested. Blur it whenever the app hides.
 * - A tap lands on the element that is already focused while the keyboard is closed. Re-focusing
 *   inside the touchend handler (a user gesture) makes iOS show the keyboard.
 */

const TEXT_ENTRY = [
  'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file])',
  'textarea',
  '[contenteditable]',
].join(',')

function isIosStandalone(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function textEntry(el: EventTarget | null): HTMLElement | null {
  return el instanceof Element ? (el.closest(TEXT_ENTRY) as HTMLElement | null) : null
}

/** The on-screen keyboard shrinks the visual viewport; a near-full viewport means it is closed. */
function keyboardClosed(): boolean {
  const vv = window.visualViewport
  return !vv || vv.height > window.innerHeight * 0.85
}

export function installIosKeyboardFix() {
  if (!isIosStandalone()) return

  const blurStale = () => {
    const active = textEntry(document.activeElement)
    if (active) active.blur()
  }
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && blurStale())
  window.addEventListener('pagehide', blurStale)
  window.addEventListener('pageshow', blurStale)

  document.addEventListener(
    'touchend',
    (e) => {
      const target = textEntry(e.target)
      if (!target || target !== document.activeElement || !keyboardClosed()) return
      target.blur()
      target.focus()
    },
    { capture: true, passive: true },
  )
}
