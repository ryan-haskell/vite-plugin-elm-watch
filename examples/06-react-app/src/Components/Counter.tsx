import { useState } from 'react'

const Counter = () => {
  const [count, setCount] = useState(0)
  const increment = () => setCount((count) => count + 1)
  return (
    <div className="card">
      <button onClick={increment}>
        React count is {count}
      </button>
      <p>
        Edit <code>src/Components/Counter.tsx</code> and save to test HMR
      </p>
    </div>
  )
}

export default Counter