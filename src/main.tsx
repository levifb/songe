import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from '@/app/App'
import { SessionProvider } from '@/app/SessionProvider'
import { ThemeProvider } from '@/app/ThemeProvider'
import { ToastProvider } from '@/app/ToastProvider'
import { registerSW } from 'virtual:pwa-register'
import './index.css'

// Instala o service worker: é ele que faz o app abrir offline e receber
// as notificações. Só existe no build de produção.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <SessionProvider>
          <BrowserRouter>
            <div className="mx-auto w-full max-w-[27rem] min-h-dvh shadow-[0_0_60px_rgba(28,35,45,0.06)]">
              <App />
            </div>
          </BrowserRouter>
        </SessionProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
