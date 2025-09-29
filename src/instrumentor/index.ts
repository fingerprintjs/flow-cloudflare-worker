import { setupInstrumentor } from './instrumentor'

setupInstrumentor({
  documentReadyState: () => document.readyState,
}).catch((error) => {
  console.error('Error during instrumentation:', error)
})
