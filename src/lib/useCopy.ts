import { useEffect, useRef, useState } from 'react'

/**
 * Clipboard copy with the shared output-toolbar behavior: a 1.5s "Copied" button
 * state, an aria-live announcement, and a window.prompt manual fallback when the
 * Clipboard API is unavailable or denied. `message` is what the screen reader hears.
 */
export function useCopy(message: string) {
  const [copied, setCopied] = useState(false)
  const [liveMsg, setLiveMsg] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setLiveMsg(message)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        setCopied(false)
        setLiveMsg('')
      }, 1500)
    } catch {
      window.prompt('Copy failed — select and copy manually:', text)
    }
  }
  return { copied, liveMsg, copy }
}

/**
 * Ctrl/Cmd+Enter fires `handler` while the owning output panel is mounted (the routes
 * mount one output panel at a time, so the shortcut is unambiguous). Copy is the
 * terminal action of every workflow — give it a keyboard path.
 */
export function useCopyShortcut(handler: () => void, enabled = true) {
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        latest.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
