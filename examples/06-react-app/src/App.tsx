import './App.css'
import viteLogo from '/vite.svg'
import Counter from './Components/Counter.elm'
import Logo from './Components/Logo.elm'
import { useState } from 'react'

function App() {
  let framework = 'Elm'
  let initialCount = 0
  let [name,setName] = useState('Elm count')
  let [count, setCount] = useState(initialCount)

  const onNameInput = (event : any) => {
    setName(event.target.value)
  }

  const onCounterIncrement = (value : number) => {
    setCount(value)
  }

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <Logo />
      </div>
      <h1>Vite + {framework}</h1>
      <input type="text" value={name} onInput={onNameInput}></input>
      <p>React sees: {count}</p>
      <Counter 
        name={name} 
        initialCount={initialCount} 
        onCounterIncrement={onCounterIncrement} />
      <p className="read-the-docs">
        Click on the Vite and {framework} logos to learn more
      </p>
    </>
  )
}

export default App
