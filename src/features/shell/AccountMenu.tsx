import { useNavigate } from "react-router-dom"
import { BookOpen, Gauge, Settings, ShieldCheck } from "lucide-react"

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

export function AccountMenu({
  onOpenGuide,
  onOpenAbout,
}: {
  onOpenGuide: () => void
  onOpenAbout: () => void
}) {
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          aria-label="Menu da conta de demonstração"
        >
          <Avatar name="Você" className="size-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Você · identidade fictícia</DropdownMenuLabel>
        <div className="px-2.5 pb-1.5 text-[10px] text-muted-foreground">
          Sem login, senha ou sessão real neste demo.
        </div>
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
        <DropdownMenuItem onSelect={() => navigate("/settings")}>
          <Settings /> Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <span>Logout desativado · sem auth real</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
