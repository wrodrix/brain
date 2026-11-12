import * as React from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  Check,
  KeyRound,
  Lock,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, Label, Separator } from "@/components/ui/form"
import { Alert, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surface"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDemo } from "@/demo/DemoProvider"
import { getProject } from "@/demo/selectors"
import { formatDateTime } from "@/lib/utils"

function DisabledField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-[11px]">{label}</Label>
      <Input value={value} readOnly disabled className="mt-1 bg-slate-50 text-xs" />
    </div>
  )
}

export function SettingsPage() {
  const { state, reset } = useDemo()
  const [searchParams, setSearchParams] = useSearchParams()
  const project = getProject(state, searchParams.get("project")) ?? state.projects[0]
  const session = state.settings.access.sessions

  React.useEffect(() => {
    if (!searchParams.get("project")) {
      const params = new URLSearchParams(searchParams)
      params.set("project", project.id)
      setSearchParams(params, { replace: true })
    }
  }, [project.id, searchParams, setSearchParams])

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/"
        className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Projetos
      </Link>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <SlidersHorizontal className="size-5 text-primary" /> Configurações
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Representação visual dos estados aprovados. Cadastro, login, CRUD de modos e MCP reais
            pertencem aos marcos seguintes.
          </p>
        </div>
        <Badge variant="warning" className="ml-auto">
          leitura · dados fictícios
        </Badge>
      </div>

      <Alert variant="warning" className="mt-3">
        Nada nesta página altera um backend, credencial ou dispositivo real. O estado vive em
        memória e recarregar restaura o cenário inicial.
      </Alert>

      <Tabs defaultValue="project" className="mt-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="project">Projeto</TabsTrigger>
          <TabsTrigger value="modes">Modos e MCP</TabsTrigger>
          <TabsTrigger value="context">Contexto</TabsTrigger>
          <TabsTrigger value="access">Acesso</TabsTrigger>
        </TabsList>

        <TabsContent value="project" className="space-y-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>Projeto de demonstração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="settings-project" className="text-[11px] font-medium">
                  Projeto
                </label>
                <select
                  id="settings-project"
                  value={project.id}
                  onChange={(event) => {
                    const params = new URLSearchParams(searchParams)
                    params.set("project", event.target.value)
                    setSearchParams(params, { replace: true })
                  }}
                  className="h-8 rounded-md border bg-card px-2 text-xs"
                >
                  {state.projects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.repo}
                    </option>
                  ))}
                </select>
                <Badge variant="outline">{project.environment}</Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <DisabledField label="Repositório" value={project.repo} />
                <DisabledField label="Base" value={project.baseBranch} />
                <DisabledField label="Diretório no ambiente" value={`/srv/${project.id}`} />
                <DisabledField label="Comando de setup" value={project.setupCommand} />
                <DisabledField
                  label="Rito de integração"
                  value={project.integrationRite === "pr" ? "PR com gates" : "Local + push"}
                />
                <DisabledField label="Preview" value="URL privada fictícia · sem exposição" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" disabled title="Salvar projeto real pertence ao M2/M3">
                  Salvar alterações
                </Button>
                <Button size="sm" variant="outline" disabled title="Bootstrap e autenticação reais pertencem ao M2">
                  <ShieldCheck /> Testar acesso ao ambiente
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Caminhos, setup e política são exemplos. Nenhum diretório do host é lido ou alterado.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-4" /> Credenciais reais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-1">
              <Alert variant="danger">
                Formulários de credenciais reais ficam desativados neste demo. Nenhuma chave, senha
                ou token é solicitado, aceito ou armazenado.
              </Alert>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="disabled-email" className="text-[11px]">
                    Email (auth futura)
                  </Label>
                  <Input id="disabled-email" disabled placeholder="desativado no M1" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="disabled-password" className="text-[11px]">
                    Senha (auth futura)
                  </Label>
                  <Input
                    id="disabled-password"
                    type="password"
                    disabled
                    placeholder="desativado no M1"
                    className="mt-1"
                  />
                </div>
              </div>
              <Button size="sm" disabled title="Better Auth e cadastro pertencem ao M2">
                <Lock /> Entrar / criar conta
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Não há autenticação fictícia apresentada como proteção de dados reais.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modes" className="space-y-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-2">
                Modos do agente <Badge variant="secondary">{state.settings.modes.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 p-3 pt-1 sm:grid-cols-2">
              {state.settings.modes.map((mode) => (
                <div key={mode.id} className="rounded-lg border p-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold">{mode.name}</span>
                    <Badge variant="outline" className="ml-auto text-[9px]">
                      versão da fixture
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{mode.description}</p>
                  <p className="mt-1 text-[10px]">
                    <span className="text-muted-foreground">Ferramentas:</span> {mode.tools}
                  </p>
                  <p className="text-[10px]">
                    <span className="text-muted-foreground">Permissão:</span> {mode.permission}
                  </p>
                  <div className="mt-1.5 flex gap-1">
                    <Button size="xs" variant="outline" disabled title="Edição de modos pertence ao M4">
                      Editar
                    </Button>
                    <Button size="xs" variant="ghost" disabled title="Edição de modos pertence ao M4">
                      Desabilitar
                    </Button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" disabled className="sm:col-span-2" title="CRUD de modos pertence ao M4">
                + Novo modo
              </Button>
              <p className="text-[10px] text-muted-foreground sm:col-span-2">
                Alterar um modo não reescreve runs antigos: o histórico preserva a versão usada. O
                CRUD seguro fica para o M4.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle>MCP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-1">
              {state.settings.mcp.map((server) => (
                <div key={server.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2.5 text-xs">
                  <span className="font-medium">{server.name}</span>
                  <Badge
                    variant={
                      server.status === "connected"
                        ? "success"
                        : server.status === "unavailable"
                          ? "danger"
                          : "muted"
                    }
                  >
                    {server.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{server.target}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    ferramentas: {server.tools ?? "não disponível"}
                  </span>
                  <p className="w-full text-[10px] text-muted-foreground">{server.note}</p>
                </div>
              ))}
              <Button size="sm" variant="outline" disabled title="Conexão MCP real pertence ao M4">
                + Adicionar conexão MCP
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Nenhum servidor MCP é contatado. Ferramentas externas exigiriam schema, política e
                auditoria próprios.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="context" className="space-y-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>Contexto e políticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3 pt-1">
              <div>
                <Label className="text-[11px]">Política de contexto</Label>
                <p className="mt-1 rounded-md border bg-slate-50 p-2 text-xs">
                  {state.settings.contextPolicy}
                </p>
              </div>
              <div>
                <Label className="text-[11px]">Perfil de permissões</Label>
                <p className="mt-1 rounded-md border bg-slate-50 p-2 text-xs">
                  {state.settings.permissionProfile}
                </p>
              </div>
              <div>
                <Label className="text-[11px]">Retenção</Label>
                <p className="mt-1 rounded-md border bg-slate-50 p-2 text-xs">
                  {state.settings.retention}
                </p>
              </div>
              <Separator />
              <div className="rounded-lg border p-2.5">
                <p className="text-xs font-medium">Compactação</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Limite técnico e teto econômico são distintos. O demo não promete compactação sem
                  perda nem inventa estimativas. Configuração completa pertence ao M4.
                </p>
              </div>
              <div className="rounded-lg border p-2.5">
                <p className="text-xs font-medium">Instruções e data</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  A retomada real atualiza data/instruções efetivas sem reescrever timestamps antigos.
                  Aqui esse comportamento é apenas representado.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-2">
                <MonitorSmartphone className="size-4" /> Sessões e dispositivos
                <Badge variant="outline">ilustrativo</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-1">
              <Alert variant="warning">
                Better Auth, senha/passkey, OAuth e revogação real pertencem ao M2. Esta lista não
                representa sessões autenticadas de verdade.
              </Alert>
              {session.map((device) => (
                <div key={device.id} className="rounded-lg border p-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{device.device}</span>
                    <Badge
                      variant={
                        device.trust === "trusted"
                          ? "success"
                          : device.trust === "untrusted"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {device.trust === "trusted"
                        ? "confiável"
                        : device.trust === "untrusted"
                          ? "não confiável"
                          : "expirado"}
                    </Badge>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      visto {formatDateTime(device.lastSeen)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">validade: {device.expires}</p>
                  <div className="mt-1.5 flex gap-1">
                    <Button size="xs" variant="outline" disabled title="Revogação real pertence ao M2">
                      Revogar sessão
                    </Button>
                    <Button size="xs" variant="ghost" disabled title="Revogação real pertence ao M2">
                      Revogar confiança
                    </Button>
                  </div>
                </div>
              ))}
              <label className="flex items-start gap-2 rounded-lg border border-dashed p-2.5 text-[11px]">
                <input type="checkbox" disabled className="mt-0.5" />
                <span>
                  <span className="font-medium">Confiar neste dispositivo</span>
                  <span className="block text-muted-foreground">
                    Desativado no demo. Prazos: 30 dias de inatividade/90 dias absolutos para
                    confiável; 15 min/1 h para os demais. A confiança exige autenticação recente e é
                    revogável.
                  </span>
                </span>
              </label>
              <p className="text-[10px] text-muted-foreground">
                Expirar acesso encerraria canais autenticados, inclusive terminal, sem interromper
                trabalho já admitido. Comportamento a provar no M2.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4" /> Limites desta representação
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1.5 p-3 pt-1 text-[11px] text-muted-foreground sm:grid-cols-2">
              <p className="flex items-start gap-1">
                <Check className="mt-0.5 size-3 shrink-0 text-green-700" /> Estados de confiança e
                expiração visíveis.
              </p>
              <p className="flex items-start gap-1">
                <Check className="mt-0.5 size-3 shrink-0 text-green-700" /> Dispositivo não confiável
                começa como padrão.
              </p>
              <p className="flex items-start gap-1">
                <X className="mt-0.5 size-3 shrink-0 text-red-700" /> Sem cookies, hash de senha ou
                revogação reais.
              </p>
              <p className="flex items-start gap-1">
                <TriangleAlert className="mt-0.5 size-3 shrink-0 text-amber-700" /> Não trate esta
                tela como proteção de dados.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">Estado em memória</p>
          <p className="text-[10px] text-muted-foreground">
            Recarregar/fechar a aba reinicia tudo. O reset abaixo restaura o cenário atual sem tocar
            em nada externo.
          </p>
        </div>
        <Link to="/usage" className="text-xs font-medium text-primary underline-offset-2 hover:underline">
          Ver cotas
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            reset()
            toast.info("Cenário reiniciado. Nenhum dado externo foi afetado.")
          }}
        >
          <RefreshCw /> Reiniciar cenário
        </Button>
      </div>
    </div>
  )
}
