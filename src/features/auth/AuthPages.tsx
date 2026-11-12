import * as React from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { Brain, Eye, EyeOff, KeyRound, LogIn, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { AUTH_LIMITS } from "@shared/auth"
import { Alert } from "@/components/ui/surface"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/surface"
import { Input, Label } from "@/components/ui/form"
import { useAuth } from "./AuthProvider"
import { ApiClientError } from "./api"

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-secondary/40 px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-5 flex items-center justify-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Brain className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Brain</span>
        </Link>
        {children}
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Login e sessões reais. Projetos, chat e execução continuam demonstrativos.
        </p>
      </div>
    </main>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  placeholder?: string
}) {
  const [visible, setVisible] = React.useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="pr-9"
        required
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-1 -translate-y-1/2"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  )
}

export function LoginPage() {
  const { status, snapshot, expired, error: authError, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = React.useState(
    (location.state as { email?: string } | null)?.email ?? snapshot?.user.email ?? "",
  )
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  if (status === "loading") return <AuthShell><p className="text-center text-sm">Carregando…</p></AuthShell>
  if (status === "setup") return <Navigate to="/setup" replace />
  if (status === "authenticated") {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== "/login" ? from : "/"} replace />
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await login(email, password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== "/login" ? from : "/", { replace: true })
    } catch (submitError) {
      if (submitError instanceof ApiClientError) {
        setError(submitError.message)
      } else {
        setError("Não foi possível entrar. Verifique a conexão com a API.")
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <LogIn className="size-5 text-primary" /> Entrar
          </h1>
          <CardDescription>
            Use o email e a senha criados no setup desta instalação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(expired || authError) && (
            <Alert variant="warning">
              {expired
                ? "Sua sessão expirou. Entre novamente; rascunhos desta aba continuam aqui."
                : authError}
            </Alert>
          )}
          {error && <Alert variant="danger" role="alert">{error}</Alert>}
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="login-password">Senha</Label>
              <div className="mt-1">
                <PasswordInput
                  id="login-password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={pending || !email || !password}>
              {pending ? "Entrando…" : "Entrar"}
            </Button>
          </form>
          <p className="text-[11px] text-muted-foreground">
            Esqueceu a senha? A recuperação é local, executada no servidor com acesso ao banco.
            Não há reset por email neste lote.
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  )
}

export function SetupPage() {
  const { status, bootstrap } = useAuth()
  const navigate = useNavigate()
  const [token, setToken] = React.useState("")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmation, setConfirmation] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  if (status === "loading") return <AuthShell><p className="text-center text-sm">Carregando…</p></AuthShell>
  if (status === "authenticated") return <Navigate to="/" replace />
  if (status === "anonymous") return <Navigate to="/login" replace />

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (password !== confirmation) {
      setError("As senhas não coincidem.")
      return
    }
    if (password.length < AUTH_LIMITS.passwordMinLength) {
      setError(`A senha precisa ter pelo menos ${AUTH_LIMITS.passwordMinLength} caracteres.`)
      return
    }
    setPending(true)
    try {
      await bootstrap({ token, name, email, password })
      toast.success("Primeiro usuário criado. Entre com a senha definida.")
      navigate("/login", { replace: true, state: { email } })
    } catch (submitError) {
      setError(
        submitError instanceof ApiClientError
          ? submitError.message
          : "Não foi possível concluir o setup.",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="size-5 text-primary" /> Primeiro acesso
          </h1>
          <CardDescription>
            Crie o único usuário inicial desta instalação. O cadastro público fica fechado depois.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="warning">
            O token de instalação é de uso único e foi exibido no terminal. Não o cole em chats ou
            logs. O setup deve ser feito por acesso confiável ao servidor.
          </Alert>
          {error && <Alert variant="danger" role="alert">{error}</Alert>}
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="setup-token">Token de instalação</Label>
              <Input
                id="setup-token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                autoComplete="one-time-code"
                className="mt-1 font-mono text-xs"
                required
              />
            </div>
            <div>
              <Label htmlFor="setup-name">Nome</Label>
              <Input
                id="setup-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="setup-email">Email</Label>
              <Input
                id="setup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="setup-password">Senha</Label>
              <div className="mt-1">
                <PasswordInput
                  id="setup-password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Mínimo de {AUTH_LIMITS.passwordMinLength} caracteres. O email não é verificado por
                SMTP neste lote.
              </p>
            </div>
            <div>
              <Label htmlFor="setup-confirmation">Confirmar senha</Label>
              <div className="mt-1">
                <PasswordInput
                  id="setup-confirmation"
                  value={confirmation}
                  onChange={setConfirmation}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={pending || !token || !name || !email || !password}
            >
              {pending ? "Criando…" : "Criar primeiro usuário"}
            </Button>
          </form>
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <KeyRound className="mt-0.5 size-3 shrink-0" />
            Se o token expirou, gere outro no servidor com <code>npm run setup:token</code>.
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
