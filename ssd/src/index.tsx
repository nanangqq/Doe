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
  body {
    overflow: hidden;
  }

  .view-container {
    background-color: #2a3538;
  }
`

root.render(
  <React.StrictMode>
    <GlobalStyle />
    <App />
  </React.StrictMode>
)
