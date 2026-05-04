import { useState } from 'react'
import { supabase } from '../services/supabase'

export default function ForgotPassword({ setCurrentPage }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?page=reset-password`,
    })

    setLoading(false)
    if (error) setMessage(error.message)
    else setMessage('Check your email for the reset link!')
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
      <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '300px' }}>
        <h2 style={{ margin: '0 0 10px', textAlign: 'center', fontSize: '20px' }}>Forgot Password</h2>
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
        {message && <p style={{ fontSize: '14px', textAlign: 'center', margin: 0 }}>{message}</p>}
        <button type="button" onClick={() => setCurrentPage('auth')} style={{ background: 'none', border: 'none', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', marginTop: '10px' }}>
          Back to login
        </button>
      </form>
    </div>
  )
}
