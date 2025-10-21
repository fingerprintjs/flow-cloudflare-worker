export function NativeForm() {
  return (
    <form action='/api/login' method='POST'>
      <label>
        <span>Login:</span>
        <input type='text' name='login' />
      </label>
      <label>
        <span>Password:</span>
        <input type='password' name='password' />
      </label>
      <button type='submit'>Submit</button>
    </form>
  )
}
