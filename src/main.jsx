import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#F9F6F0',
              color: '#3E2723',
              border: '1px solid rgba(139, 111, 71, 0.2)',
              borderRadius: '2px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: '#5A6E4A', secondary: '#F9F6F0' } },
            error: { iconTheme: { primary: '#B85C3E', secondary: '#F9F6F0' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
