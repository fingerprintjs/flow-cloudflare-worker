import './App.css'
import { NativeForm } from './Form.tsx'
import { useState } from 'react'

function App() {
  const [isShowingForm, setIsShowingForm] = useState(false)

  return (
    <>
      <h1>React SPA</h1>
      <p>Example app for testing with Flow.</p>

      {isShowingForm && <NativeForm />}
      {!isShowingForm && <button onClick={() => setIsShowingForm(true)}>Show form</button>}
    </>
  )
}

export default App
