/**
 * @module main
 * @description Точка входа приложения.
 * Рендерит корневой компонент App в режиме StrictMode.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/** Монтирование React-приложения в DOM-элемент #root */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
