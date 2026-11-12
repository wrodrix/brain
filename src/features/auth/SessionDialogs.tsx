import * as React from "react"
import { LogIn, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert } from "@/components/ui/surface"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/form"
import { useAuth } from "./AuthProvider"
import { ApiClientError, authApi } from "./api"

export function SessionExpiredDialog() {
  const { status, snapshot, expired, dismissExpired, login } = useAuth()
  const [email, setEmail] = React.useState(snapshot?.user.email ?? "")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await login(email, password)
      setPassword("")
      toast.success("Sessão retomada.")
    } catch (submitError) {
      setError(
        submitError instanceof ApiClientError
          ? submitError.message
          : "Não foi possível entrar novamente.",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={status === "expired"}
      onOpenChange={(open) => {
        if (!open) dismissExpired()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" /> Sessão expirada
          </DialogTitle>
          <DialogDescription>
            Entre novamente para continuar. O que está nesta aba — inclusive rascunhos — permanece
            aqui; nenhum trabalho de agente é executado neste lote.
          </DialogDescription>
        </DialogHeader>
        {expired && error && <Alert variant="danger" role="alert">{error}</Alert>}
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="expired-email">Email</Label>
            <Input
              id="expired-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="expired-password">Senha</Label>
            <Input
              id="expired-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1"
              required
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={dismissExpired}>
              Voltar ao login
            </Button>
            <Button type="submit" disabled={pending || !email || !password}>
              <LogIn /> {pending ? "Entrando…" : "Entrar novamente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ReauthDialog({
  open,
  onOpenChange,
  onSuccess,
  actionLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void | Promise<void>
  actionLabel: string
}) {
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await authApi.reauth({ password })
      setPassword("")
      toast.success("Identidade confirmada.")
      await onSuccess()
      onOpenChange(false)
    } catch (submitError) {
      setError(
        submitError instanceof ApiClientError
          ? submitError.message
          : "Não foi possível confirmar a senha.",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar identidade</DialogTitle>
          <DialogDescription>
            {actionLabel} exige autenticação recente. Informe sua senha atual.
          </DialogDescription>
        </DialogHeader>
        {error && <Alert variant="danger" role="alert">{error}</Alert>}
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="reauth-password">Senha atual</Label>
            <Input
              id="reauth-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1"
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !password}>
              {pending ? "Confirmando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
