import { useEffect } from 'react'

// Locks <html> with position:fixed + saved scrollY — iOS Safari safe.
// Locking body overflow is unreliable on iOS.
export function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return
    const scrollY = window.scrollY
    const html = document.documentElement
    const original = {
      position: html.style.position,
      top: html.style.top,
      left: html.style.left,
      right: html.style.right,
      width: html.style.width,
    }
    html.style.position = 'fixed'
    html.style.top = `-${scrollY}px`
    html.style.left = '0'
    html.style.right = '0'
    html.style.width = '100%'
    return () => {
      Object.assign(html.style, original)
      window.scrollTo(0, scrollY)
    }
  }, [locked])
}
