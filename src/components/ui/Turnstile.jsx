import { useEffect, useRef } from 'react'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

let scriptPromise = null
function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Widget de captcha (Cloudflare Turnstile). Se VITE_TURNSTILE_SITE_KEY não
 * estiver configurada, não renderiza nada e o formulário segue sem captcha
 * — útil em desenvolvimento local, mas configure em produção.
 */
export default function Turnstile({ onVerify, onExpire }) {
  const containerRef = useRef(null)
  const widgetId = useRef(null)

  useEffect(() => {
    if (!SITE_KEY) return

    let cancelled = false
    loadTurnstileScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: onVerify,
        'expired-callback': onExpire,
        theme: 'light',
      })
    })

    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!SITE_KEY) return null

  return <div ref={containerRef} className="my-2" />
}

export const isCaptchaEnabled = !!SITE_KEY
