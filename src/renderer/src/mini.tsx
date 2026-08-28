import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import MiniFloating from './components/MiniFloating'
import { useTheme } from './theme'

function Mini(): React.JSX.Element {
  useTheme()
  return <MiniFloating />
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Mini />
  </StrictMode>
)
