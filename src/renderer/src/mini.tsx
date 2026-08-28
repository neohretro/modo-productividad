import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import MiniFloating from './components/MiniFloating'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <MiniFloating />
  </StrictMode>
)
