import './assets/main.css'
// Precisa valer antes de o chunk do Excalidraw ser avaliado, senão ele resolve as fontes pelo
// CDN — que a CSP recusa, deixando o desenho com as fontes do sistema.
import './components/editor/drawingAssetPath'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
