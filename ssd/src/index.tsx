import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './app'
import { createGlobalStyle } from 'styled-components'
import reset from 'styled-reset'

const rootElement =
  document.getElementById('root') || document.createElement('div')
const root = createRoot(rootElement)

const GlobalStyle = createGlobalStyle`
  ${reset}
  /* other styles */
`

root.render(
  <React.StrictMode>
    <GlobalStyle />
    <App />
  </React.StrictMode>
)
