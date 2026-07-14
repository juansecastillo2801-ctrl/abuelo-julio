export default function ForgotPasswordPage() {
  return (
    <div className="login-bg">
      <div className="login-box" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Para restablecer tu contraseña, contactá al administrador del sistema.
        </p>
        <a href="/login" className="btn btn-secondary" style={{ marginTop: '16px', display: 'inline-flex' }}>
          Volver al inicio
        </a>
      </div>
    </div>
  )
}
