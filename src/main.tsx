import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { register } from './utils/serviceWorker'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register service worker for PWA functionality
register({
  onSuccess: () => {
    console.log('PWA installed successfully');
  },
  onUpdate: () => {
    console.log('PWA updated');
  }
});