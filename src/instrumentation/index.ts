import { getProtectedApis } from './protectedApis'

document.addEventListener('DOMContentLoaded', () => {
  console.info('DOMContentLoaded triggered.')

  const protectedApis = getProtectedApis()

  console.log({ protectedApis })
})
