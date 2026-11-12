import * as React from "react"
import { useNavigate } from "react-router-dom"
import { BookOpen, Gauge, LogOut, MonitorSmartphone, Settings, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar } from "@/components/ui/surface"
import { useAuth } from "@/features/auth/AuthProvider"

export function AccountMenu({
  onOpenGuide,
  onOpenAbout,
}: {
  onOpenGuide: () => void
  onOpenAbout: () => void
}) {
  const navigate = useNavigate()
  const { snapshot, logout } = useAuth()
  const [pending, setPending] = React.useState(false)

  const name = snapshot?.user.name ?? "Conta"
  const email = snapshot?.user.email ?? ""
  const trusted = snapshot?.session.trusted ?? false

  async function onLogout() {
    setPending(true)
    try {
      await logout()
      toast.info("Sessão encerrada neste navegador.")
      navigate("/login", { replace: true })
    } finally {
      setPending(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          aria-label={`Menu da conta de ${name}`}
        >
          <Avatar name={name} className="size-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-1.5">
          <span className="truncate">{name}</span>
          <Badge variant={trusted ? "success" : "warning"} className="ml-auto text-[9px]">
            {trusted ? "confiável" : "sessão curta"}
          </Badge>
        </DropdownMenuLabel>
        <div className="truncate px-2.5 pb-1.5 text-[10px] text-muted-foreground">{email}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onOpenGuide}>
          <BookOpen /> Roteiro guiado
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onOpenAbout}>
          <ShieldCheck /> Sobre a demonstração
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/usage")}>
          <Gauge /> Cotas e conexões
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/settings?tab=access")}>
          <MonitorSmartphone /> Sessões e dispositivos
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/settings")}>
          <Settings /> Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={pending} onSelect={() => void onLogout()}>
          <LogOut /> {pending ? "Saindo…" : "Sair"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
