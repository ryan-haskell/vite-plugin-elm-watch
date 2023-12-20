import './App.css'
import viteLogo from '/vite.svg'
import Counter from './Components/Counter.elm'
import Logo from './Components/Logo.elm'

function App() {
  let framework = 'Elm'

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <Logo />
      </div>
      <h1>Vite + {framework}</h1>
      <Counter />
      <p className="read-the-docs">
        Click on the Vite and {framework} logos to learn more
      </p>
    </>
  )
}

export default App
