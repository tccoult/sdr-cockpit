import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>SDR Cockpit</h1>
      <p>Software Defined Radio Web Application</p>
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
      <p style={{ marginTop: '20px', color: '#666' }}>
        Frontend is running successfully!
      </p>
    </div>
  )
}

export default App
