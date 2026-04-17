import './index.css'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { AppProviders } from './app/providers'
import { AppRouterProvider } from './app/router-provider'

const rootElement = document.getElementById('root')!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <AppProviders>
        <AppRouterProvider />
      </AppProviders>
    </StrictMode>,
  )
}
