import { setupInstrumentation } from './instrumentation'

setupInstrumentation().catch((error) => {
  console.error('Error during instrumentation:', error)
})
