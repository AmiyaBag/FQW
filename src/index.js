import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log(
  `🌐 API сервер: ${process.env.REACT_APP_API_URL}\n` +
  `🖥️ Для другого устройства:\n` +
  `http://${new URL(process.env.REACT_APP_API_URL).hostname}:${window.location.port || 3000}`
);