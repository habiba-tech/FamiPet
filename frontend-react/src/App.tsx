import { ThemeProvider } from './contexts/ThemeContext'
import { AppRouter } from './router'

function App() {
  return (
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  )
}

export default App