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
