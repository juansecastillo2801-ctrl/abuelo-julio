'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const errorParam = searchParams.get('error')
  const messageParam = searchParams.get('message')

  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (errorParam === 'inactive') {
      toast.error('Tu cuenta está desactivada, contactá al administrador.')
    }
    if (errorParam === 'auth') {
      toast.error('Error de autenticación. Intentá de nuevo.')
    }
    if (messageParam === 'password-updated') {
      toast.success('Contraseña actualizada. Podés iniciar sesión.')
    }
  }, [errorParam, messageParam])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error || !data.user) {
      toast.error('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }

    // Bloquear cuentas desactivadas
    const { data: profile } = await supabase
      .from('users')
      .select('is_active')
      .eq('auth_user_id', data.user.id)
      .single()

    if (profile && profile.is_active === false) {
      await supabase.auth.signOut()
      toast.error('Tu cuenta está desactivada, contactá al administrador.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="login-bg">
      <div style={{ display: 'flex', width: '100%', maxWidth: '900px', minHeight: '540px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', animation: 'slideUp 0.4s ease' }}>
        {/* Left — form */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 40px', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Abuelo Julio"
              style={{ height: '72px', width: 'auto', display: 'block', margin: '0 auto', objectFit: 'contain' }}
            />
            <p style={{ fontSize: '12px', letterSpacing: '3px', color: 'var(--text-muted)', marginTop: '12px', textTransform: 'uppercase' }}>
              Sistema de gestión
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '320px', margin: '0 auto', width: '100%' }}>
            <div>
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="form-label">Contraseña</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        {/* Right — branding panel */}
        <div className="hide-mobile" style={{ width: '45%', position: 'relative', backgroundColor: '#0A0806', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 40%, rgba(201,184,150,0.04) 0%, transparent 70%)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ borderLeft: '2px solid var(--accent-color)', paddingLeft: '20px', marginBottom: '32px' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: '#E8DFD3', lineHeight: 1.4, fontWeight: 400 }}>
                La auténtica expresión de lo tradicional
              </p>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '3px', paddingLeft: '20px', textTransform: 'uppercase' }}>
              Premium Beef Argentina
            </p>
            <div style={{ marginTop: '48px', paddingLeft: '20px', display: 'flex', gap: '32px' }}>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 500, color: 'var(--accent-color)' }}>4ta</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Generación</p>
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 500, color: 'var(--accent-color)' }}>15+</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Países</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
