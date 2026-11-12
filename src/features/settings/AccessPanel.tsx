import * as React from "react"
import { Clock3, KeyRound, Laptop, Loader2, MonitorSmartphone, ShieldCheck, ShieldOff } from "lucide-react"
import { toast } from "sonner"

import type { SessionSummary } from "@shared/auth"
import { Alert, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surface"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, Label, Separator } from "@/components/ui/form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/features/auth/AuthProvider"
import { ApiClientError, authApi } from "@/features/auth/api"
import { ReauthDialog } from "@/features/auth/SessionDialogs"
const deadlineFormatter = new Intl.DateTimeFormat("pt-BR", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

function deadlineLabel(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "horário indisponível"
  return deadlineFormatter.format(date)
}

function shortDeadline(iso: string) {
  return deadlineLabel(iso)
}

export function AccessPanel() {
  const { snapshot, updateSession, updateDevice, dismissExpired } = useAuth()
  const [sessions, setSessions] = React.useState<SessionSummary[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [confirm, setConfirm] = React.useState<{ id: string; label: string } | null>(null)
  const [reauthOpen, setReauthOpen] = React.useState(false)
  const pendingAction = React.useRef<(() => Promise<void>) | null>(null)

  const loadSessions = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await authApi.sessions()
      setSessions(result.sessions)
    } catch (loadError) {
      if (loadError instanceof ApiClientError && loadError.status === 401) return
      setError(loadError instanceof Error ? loadError.message : "Não foi possível listar as sessões.")
    } finally {
      setLoading(false)
    }
  }, [])

  const activeSessionId = snapshot?.session.id
  React.useEffect(() => {
    // Consulta inicial de um recurso externo; recarrega após novo login/expiração.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSessions()
  }, [loadSessions, activeSessionId])

  if (!snapshot) return null

  const { session, device } = snapshot
  const trusted = session.trusted

  async function guarded(action: () => Promise<void>) {
    try {
      await action()
    } catch (actionError) {
      if (actionError instanceof ApiClientError && actionError.code === "REAUTH_REQUIRED") {
        pendingAction.current = action
        setReauthOpen(true)
        return
      }
      toast.error(
        actionError instanceof Error ? actionError.message : "Não foi possível concluir a ação.",
      )
    }
  }

  async function onTrust() {
    await guarded(async () => {
      const result = await authApi.trustDevice()
      updateSession(result.session)
      updateDevice(result.device)
      toast.success("Este navegador agora é confiável.")
      await loadSessions()
    })
  }

  async function onRevokeTrust() {
    await guarded(async () => {
      await authApi.revokeTrust()
      toast.info("Confiança revogada; este navegador precisa entrar novamente.")
      dismissExpired()
    })
  }

  async function onRevokeSession(id: string) {
    await guarded(async () => {
      await authApi.revokeSession(id)
      toast.success("Sessão revogada.")
      await loadSessions()
    })
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            <MonitorSmartphone className="size-4" /> Este navegador
            <Badge variant={trusted ? "success" : "warning"}>
              {trusted ? "confiável" : "não confiável"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 pt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Laptop className="size-3.5 text-muted-foreground" />
            <span className="font-medium">{device.label}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{device.userAgent ?? "user-agent indisponível"}</span>
          </div>
          <div className="grid gap-1.5 text-[11px] text-muted-foreground sm:grid-cols-2">
            <p>
              <span className="text-foreground">Inatividade até:</span> {deadlineLabel(session.expiresAt)}
            </p>
            <p>
              <span className="text-foreground">Teto absoluto:</span>{" "}
              {deadlineLabel(session.absoluteExpiresAt)}
            </p>
            <p>
              <span className="text-foreground">Última atividade:</span>{" "}
              {deadlineLabel(session.lastActivityAt)}
            </p>
            <p>
              <span className="text-foreground">Autenticação recente:</span>{" "}
              {deadlineLabel(session.lastAuthAt)}
            </p>
          </div>
          {!trusted ? (
            <>
              <Alert variant="warning">
                Sessão curta: 15 min de inatividade e máximo de 1 h. Confiar neste
                navegador é opcional, explícito e revogável; os prazos longos são 30 dias/90 dias.
              </Alert>
              <Button size="sm" onClick={() => void onTrust()}>
                <ShieldCheck /> Confiar neste dispositivo
              </Button>
            </>
          ) : (
            <>
              <Alert variant="success">
                Confiável neste navegador: 30 dias sem atividade e teto de 90 dias desde o login.
                A confiança vale só para este perfil de navegador.
              </Alert>
              <Button variant="outline" size="sm" onClick={() => void onRevokeTrust()}>
                <ShieldOff /> Revogar confiança deste navegador
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock3 className="size-4" /> Sessões ativas
            {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-1">
          {error && <Alert variant="danger">{error}</Alert>}
          {!loading && sessions.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma sessão ativa encontrada.</p>
          )}
          {sessions.map((item) => (
            <div key={item.id} className="rounded-lg border p-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium">{item.device?.label ?? "Dispositivo desconhecido"}</span>
                {item.current && <Badge variant="outline">esta sessão</Badge>}
                <Badge variant={item.trusted ? "success" : "warning"}>
                  {item.trusted ? "confiável" : "não confiável"}
                </Badge>
                {!item.current && (
                  <Button
                    size="xs"
                    variant="outline"
                    className="ml-auto"
                    onClick={() =>
                      setConfirm({
                        id: item.id,
                        label: item.device?.label ?? "esta sessão",
                      })
                    }
                  >
                    Revogar
                  </Button>
                )}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                criada {shortDeadline(item.createdAt)} · atividade {shortDeadline(item.lastActivityAt)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                inatividade até {shortDeadline(item.expiresAt)} · teto {shortDeadline(item.absoluteExpiresAt)}
              </p>
            </div>
          ))}
          {loading && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Consultando o banco…
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">
            Revogar a confiança encerra as sessões deste navegador. Revogar outra sessão exige
            autenticação recente.
          </p>
        </CardContent>
      </Card>

      <PasswordCard onGuarded={guarded} onChanged={loadSessions} />

      <ReauthDialog
        open={reauthOpen}
        onOpenChange={setReauthOpen}
        actionLabel="Esta ação de segurança"
        onSuccess={async () => {
          const action = pendingAction.current
          pendingAction.current = null
          if (action) await action()
        }}
      />

      <Dialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Revogar sessão</DialogTitle>
            <DialogDescription>
              A sessão de {confirm?.label} perde acesso imediatamente. Esta ação não cancela
              trabalho já admitido no backend; neste lote não há agente real.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!confirm) return
                const id = confirm.id
                setConfirm(null)
                void onRevokeSession(id)
              }}
            >
              Revogar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PasswordCard({
  onGuarded,
  onChanged,
}: {
  onGuarded: (action: () => Promise<void>) => Promise<void>
  onChanged: () => Promise<void>
}) {
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmation, setConfirmation] = React.useState("")
  const [pending, setPending] = React.useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (newPassword !== confirmation) {
      toast.error("As senhas novas não coincidem.")
      return
    }
    if (newPassword.length < 8) {
      toast.error("A nova senha precisa ter pelo menos 8 caracteres.")
      return
    }
    setPending(true)
    await onGuarded(async () => {
      await authApi.changePassword({ currentPassword, newPassword })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmation("")
      toast.success("Senha alterada; outras sessões e confianças foram revogadas.")
      await onChanged()
    })
    setPending(false)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <KeyRound className="size-4" /> Trocar senha
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <form className="space-y-2" onSubmit={submit}>
          <div>
            <Label htmlFor="current-password" className="text-[11px]">
              Senha atual
            </Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="new-password" className="text-[11px]">
                Nova senha
              </Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="text-[11px]">
                Confirmar
              </Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-1"
                required
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Alterando…" : "Alterar senha"}
            </Button>
            <Separator className="hidden h-4 sm:block" orientation="vertical" />
            <p className="text-[10px] text-muted-foreground">
              Exige senha atual e autenticação recente. Revoga outras sessões e confianças.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
