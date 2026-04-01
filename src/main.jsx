import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/theme.css';
import ErrorBoundary from './components/ui/ErrorBoundary';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
