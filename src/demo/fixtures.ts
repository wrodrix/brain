import type {
  DemoFile,
  DemoState,
  Issue,
  Job,
  Message,
  ProcessGroup,
  PullRequest,
  Scenario,
  SearchResult,
  Session,
  SettingsState,
  SourceRef,
  Worktree,
} from "./types"

export const scenarios: Scenario[] = [
  {
    id: "normal",
    name: "Conversa concluída",
    description:
      "Uma troca curta: prompt, atividade de ferramentas, subagente e resposta final com código.",
    focus: "Chat e atividade do agente",
  },
  {
    id: "setup-failed",
    name: "Setup falhou",
    description:
      "O worktree foi criado, mas o setup saiu com código 1. A sessão não é apresentada como pronta.",
    focus: "Falha de setup e retomada",
  },
  {
    id: "during-run",
    name: "Durante execução",
    description:
      "O agente está trabalhando e uma continuação já foi enviada. A fila distingue admissão, entrega e incorporação.",
    focus: "Admissão, entrega e incorporação",
  },
  {
    id: "approval",
    name: "Aprovação pendente",
    description:
      "Uma ação sensível aguarda decisão. Permitir e recusar são escolhas distintas; nada executa sem confirmação.",
    focus: "Confirmação de ferramenta",
  },
  {
    id: "review-stale",
    name: "Revisão antiga",
    description:
      "Um gate obrigatório falhou e o SHA revisado ficou para trás. O merge permanece bloqueado.",
    focus: "Gates, evidência e merge",
  },
  {
    id: "network",
    name: "Rede instável",
    description:
      "Ambiente reconectando, terminal encerrado e métricas desatualizadas. Nada é apresentado como sucesso.",
    focus: "Indisponibilidade e estados incertos",
  },
]

const T = {
  base: "2026-11-11T11:40:00.000Z",
  setup: "2026-11-11T11:42:10.000Z",
  user: "2026-11-11T11:56:00.000Z",
  assistant: "2026-11-11T11:57:20.000Z",
  tool: "2026-11-11T11:58:05.000Z",
  older: "2026-11-11T10:18:00.000Z",
  yesterday: "2026-11-10T16:20:00.000Z",
}

const loginController = `<?php

namespace App\\Http\\Controllers;

use App\\Models\\User;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Auth;

class LoginController extends Controller
{
    public function store(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials)) {
            return back()->withErrors([
                'email' => 'Credenciais inválidas.',
            ])->onlyInput('email');
        }

        $request->session()->regenerate();

        return redirect()->intended('/dashboard');
    }
}
`

const loginControllerDiff = `@@ -18,7 +18,11 @@ class LoginController extends Controller
         }

         $request->session()->regenerate();
 
-        return redirect('/dashboard');
+        $target = $request->session()->pull('url.intended', '/dashboard');
+
+        if (! str_starts_with($target, '/')) {
+            $target = '/dashboard';
+        }
+
+        return redirect()->to($target);
     }
 }`

const loginTest = `<?php

namespace Tests\\Feature;

use App\\Models\\User;
use Illuminate\\Foundation\\Testing\\RefreshDatabase;
use Tests\\TestCase;

class LoginRedirectTest extends TestCase
{
    use RefreshDatabase;

    public function test_redirects_to_intended_page_after_login(): void
    {
        $user = User::factory()->create();

        $this->get('/reports')->assertRedirect('/login');

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertRedirect('/reports');
        $this->assertAuthenticatedAs($user);
    }
}
`

const markdownGuide = `# Guia de instalação

Este documento descreve o ambiente **Linux-B** usado pelo projeto Campo.

## Passos

1. Instalar as dependências do repositório.
2. Copiar o arquivo de ambiente de exemplo.
3. Executar o setup do projeto.

> Nenhum segredo real deve ser colocado nos exemplos.

O comando de verificação é \`pnpm check\`.
`

const issue142Body = `Ao acessar uma rota protegida, o usuário é enviado ao login. Depois de autenticar, o destino original é perdido e a sessão sempre termina em \`/dashboard\`.

### Passos para reproduzir

1. Abrir \`/reports\` sem sessão.
2. Autenticar com um usuário válido.
3. Observar o redirecionamento.

**Esperado:** voltar para \`/reports\`.  
**Atual:** abrir \`/dashboard\`.

O teste \`LoginRedirectTest\` já cobre o cenário, mas está falhando.`

const issue119Body = `Depois do logout, alguns navegadores mantêm uma página em cache. A investigação anterior encontrou o trecho de \`redirect()\` e registrou o comportamento esperado.

- Não reutilizar a sessão anterior.
- Preservar a mensagem de confirmação.
- Não abrir uma nova tentativa sem solicitação explícita.`

const issue88Body = `Precisamos documentar como o preview privado funciona no ambiente de demonstração.

- URL acessível pela rede escolhida.
- Sem abrir portas automaticamente.
- Estado explícito quando o acesso for revogado.`

const campoIssueBody = `Revisar o guia de instalação do ambiente Linux-B e confirmar que os exemplos não contêm credenciais.

A publicação fica no overlay de issues. O worktree continua disponível para revisão.`

function sessionMessages(scenario: DemoState["ui"]["scenario"]): Message[] {
  const running = scenario === "during-run"
  const approval = scenario === "approval"
  const network = scenario === "network"

  const finalAnswer = `O destino original agora é preservado antes de regenerar a sessão.

- \`LoginController\` lê \`url.intended\` antes de autenticar.
- O retorno é aceito apenas para caminhos internos.
- \`LoginRedirectTest\` cobre o retorno a \`/reports\`.

\`\`\`php
$target = $request->session()->pull('url.intended', '/dashboard');

if (! str_starts_with($target, '/')) {
    $target = '/dashboard';
}

return redirect()->to($target);
\`\`\`

O worktree continua disponível para revisão.`

  const messages: Message[] = [
    {
      id: "msg-login-redirect",
      sessionId: "sess-impl",
      role: "user",
      content:
        "O redirect após autenticação está caindo em `/dashboard` mesmo quando a rota original era `/reports`.\n\nCorrija preservando a sessão e valide com `LoginRedirectTest`.",
      createdAt: T.user,
      sources: [
        {
          id: "src-file-login",
          kind: "file",
          label: "LoginController.php",
          detail: "app/Http/Controllers/LoginController.php · v7",
          path: "app/Http/Controllers/LoginController.php",
          version: 7,
          provenance: "Snapshot do worktree issue-142-login no envio",
          content: loginController,
        },
        {
          id: "src-issue-142",
          kind: "issue",
          label: "equipe/atlas#142",
          detail: "Corrigir fluxo de login · aberta",
          repo: "equipe/atlas",
          issueNumber: 142,
          provenance: "Descrição + 3/3 comentários carregados",
          content: issue142Body,
        },
      ],
      anchor: "redirect-error",
    },
    {
      id: "msg-tool-tests",
      sessionId: "sess-impl",
      role: "tool",
      content: "Executar testes de autenticação",
      createdAt: T.tool,
      tool: {
        id: "tool-tests",
        name: "shell",
        args: '{\n  "command": "php artisan test tests/Feature/LoginRedirectTest.php",\n  "background": true\n}',
        argsComplete: true,
        state: network ? "failed" : running ? "executing" : "succeeded",
        scope: "worktree issue-142-login · Linux-A",
        output: network
          ? "A conexão com o ambiente foi encerrada antes do exit code. Resultado desconhecido."
          : running
            ? "PASS  Tests\\Feature\\LoginRedirectTest\n  ✓ redirects to intended page after login\n\nExecutando 12 testes restantes…"
            : "PASS  Tests\\Feature\\LoginRedirectTest\n1 test passed · exit 0",
        startedAt: T.tool,
        jobId: "job-tests",
      },
      jobId: "job-tests",
    },
  ]

  if (running) {
    messages.push({
      id: "msg-generating-args",
      sessionId: "sess-impl",
      role: "tool",
      content: "Preparar inspeção do retorno",
      createdAt: "2026-11-11T11:57:40.000Z",
      tool: {
        id: "tool-generating",
        name: "shell",
        args: '{"command":"php artisan test tests/Feature/Login',
        argsComplete: false,
        state: "generating",
        scope: "worktree issue-142-login · Linux-A",
        startedAt: "2026-11-11T11:57:40.000Z",
      },
    })
  }

  messages.push({
    id: "msg-subagent",
    sessionId: "sess-impl",
    role: "tool",
    content: "Revisar o cenário de login",
    createdAt: "2026-11-11T11:58:05.000Z",
    tool: {
      id: "tool-review",
      name: "subagent",
      args: '{\n  "mode": "review",\n  "objective": "Revisar o cenário de redirecionamento"\n}',
      argsComplete: true,
      state: running ? "executing" : network ? "unknown" : "succeeded",
      scope: "sessão filha própria",
      output: network
        ? "Sem confirmação de conclusão após a queda de conexão."
        : "1 arquivo revisado; nenhuma escrita.",
      startedAt: "2026-11-11T11:58:05.000Z",
      jobId: "job-review",
    },
    jobId: "job-review",
  })

  if (approval) {
    messages.push(
      {
        id: "msg-approval-intro",
        sessionId: "sess-impl",
        role: "assistant",
        content:
          "Os testes e a revisão passaram. Para preparar o banco de staging, preciso de autorização para recriá-lo.",
        createdAt: "2026-11-11T11:58:20.000Z",
      },
      {
        id: "msg-waiting-approval",
        sessionId: "sess-impl",
        role: "tool",
        content: "Preparar banco de staging",
        createdAt: "2026-11-11T11:58:30.000Z",
        tool: {
          id: "tool-approval",
          name: "shell",
          args: '{\n  "command": "php artisan migrate:fresh --env=staging",\n  "scope": "banco de staging"\n}',
          argsComplete: true,
          state: "awaiting_approval",
          scope: "worktree issue-142-login · Linux-A · banco de staging",
          startedAt: "2026-11-11T11:58:30.000Z",
          approval: {
            decision: null,
            scope: "esta chamada",
            risk: "Alto · recria o banco de staging",
            requestedBy: "build / sessão Implementação",
          },
        },
      },
    )
  } else {
    messages.push({
      id: "msg-plan",
      sessionId: "sess-impl",
      role: "assistant",
      content: network
        ? "Não consegui concluir a validação: a conexão com o ambiente caiu durante os testes.\n\n- O último resultado conhecido não é tratado como sucesso.\n- A mensagem e o rascunho permanecem locais.\n\nQuando a conexão voltar, posso retomar do último ponto seguro."
        : running
          ? "Vou preservar o destino original antes de regenerar a sessão."
          : finalAnswer,
      createdAt: "2026-11-11T11:58:40.000Z",
      streaming: running,
    })
  }

  return messages
}

function makeSessions(scenario: DemoState["ui"]["scenario"]): Session[] {
  return [
    {
      id: "sess-impl",
      worktreeId: "wt-login",
      title: "Implementação",
      mode: "build",
      model: "deepseek-v4.1-flash",
      effort: "alto",
      status:
        scenario === "setup-failed"
          ? "interrupted"
          : scenario === "during-run" || scenario === "approval" || scenario === "network"
            ? "running"
            : "idle",
      updatedAt: T.tool,
      messages: sessionMessages(scenario),
    },
    {
      id: "sess-child",
      worktreeId: "wt-login",
      title: "Revisão de login",
      mode: "review",
      model: "deepseek-v4.1-flash",
      effort: "médio",
      status: "idle",
      parentSessionId: "sess-impl",
      updatedAt: "2026-11-11T11:59:10.000Z",
      messages: [
        {
          id: "msg-child-start",
          sessionId: "sess-child",
          role: "assistant",
          content:
            "Sessão filha própria. Estou inspecionando os cenários de autenticação e o diff atual. Este texto não é injetado no contexto do pai.",
          createdAt: "2026-11-11T11:59:05.000Z",
        },
        {
          id: "msg-child-tool",
          sessionId: "sess-child",
          role: "tool",
          content: "Leitura de arquivo",
          createdAt: "2026-11-11T11:59:10.000Z",
          tool: {
            id: "child-read",
            name: "read_file",
            args: '{"path":"tests/Feature/LoginRedirectTest.php"}',
            argsComplete: true,
            state: "succeeded",
            scope: "somente leitura · sessão filha",
            output: "52 linhas lidas. Nenhuma escrita realizada.",
            startedAt: "2026-11-11T11:59:08.000Z",
          },
        },
      ],
    },
    {
      id: "sess-review",
      worktreeId: "wt-login",
      title: "Revisão",
      mode: "review",
      model: "deepseek-v4.1-flash",
      effort: "médio",
      status: "idle",
      updatedAt: "2026-11-11T11:48:00.000Z",
      messages: [
        {
          id: "msg-review",
          sessionId: "sess-review",
          role: "assistant",
          content:
            "A revisão precisa considerar o SHA do diff, não apenas a branch. Os gates abaixo são fictícios e pertencem ao SHA `a1b2c3d`.",
          createdAt: "2026-11-11T11:47:40.000Z",
        },
      ],
    },
    {
      id: "sess-docs",
      worktreeId: "wt-docs",
      title: "Revisão docs",
      mode: "review",
      model: "deepseek-v4.1-flash",
      effort: "baixo",
      status: "idle",
      updatedAt: "2026-11-10T17:10:00.000Z",
      messages: [
        {
          id: "msg-docs",
          sessionId: "sess-docs",
          role: "assistant",
          content:
            "Documentação revisada. O checkout já foi integrado e continua disponível; nenhum processo foi encerrado por isso.",
          createdAt: "2026-11-10T17:09:00.000Z",
        },
      ],
    },
    {
      id: "sess-investigation",
      worktreeId: "wt-investigation",
      title: "Investigação login",
      mode: "investigate",
      model: "deepseek-v4.1-flash",
      effort: "médio",
      status: "historical",
      updatedAt: T.yesterday,
      historicalNote:
        "Checkout removido manualmente. Sessão, evidências e trechos permanecem consultáveis.",
      messages: [
        {
          id: "msg-investigation-search",
          sessionId: "sess-investigation",
          role: "assistant",
          content:
            "A investigação encontrou o problema no redirect após autenticação: o destino pretendido era descartado antes da regeneração da sessão. O teste LoginRedirectTest falhou com 302 para /dashboard.",
          createdAt: T.yesterday,
          anchor: "redirect-investigation",
        },
        {
          id: "msg-investigation-tool",
          sessionId: "sess-investigation",
          role: "tool",
          content: "Saída do teste no checkout removido",
          createdAt: "2026-11-10T16:22:00.000Z",
          tool: {
            id: "investigation-test",
            name: "shell",
            args: '{"command":"php artisan test --filter=LoginRedirectTest"}',
            argsComplete: true,
            state: "failed",
            scope: "histórico restaurável · somente leitura",
            output:
              "FAIL Tests\\Feature\\LoginRedirectTest\nExpected redirect [/reports], received [/dashboard].",
            startedAt: "2026-11-10T16:21:40.000Z",
          },
        },
      ],
    },
    {
      id: "sess-campo",
      worktreeId: "wt-guide",
      title: "Guia de instalação",
      mode: "planner",
      model: "deepseek-v4.1-flash",
      effort: "baixo",
      status: "idle",
      updatedAt: "2026-11-11T10:30:00.000Z",
      messages: [
        {
          id: "msg-campo",
          sessionId: "sess-campo",
          role: "user",
          content:
            "Atualize o guia de instalação e destaque que o preview não deve expor portas automaticamente. Mantenha os exemplos sem credenciais.",
          createdAt: "2026-11-11T10:20:00.000Z",
          sources: [
            {
              id: "src-campo-issue",
              kind: "issue",
              label: "equipe/campo-docs#12",
              detail: "Guia de instalação Linux · aberta",
              repo: "equipe/campo-docs",
              issueNumber: 12,
              provenance: "Descrição + 0 comentários carregados",
              content: campoIssueBody,
            },
          ],
        },
      ],
    },
  ]
}

function makeIssues(): Issue[] {
  return [
    {
      id: "issue-142",
      projectId: "atlas",
      repo: "equipe/atlas",
      number: 142,
      title: "Corrigir fluxo de login",
      body: issue142Body,
      state: "open",
      labels: ["bug", "autenticação"],
      author: "Marina Duarte",
      updatedAt: "2026-11-11T11:30:00.000Z",
      comments: [
        {
          id: "c142-1",
          author: "Marina Duarte",
          body: "O relato original incluía o link `/reports`, mas o retorno sempre vai para o dashboard.",
          createdAt: "2026-11-10T09:10:00.000Z",
        },
        {
          id: "c142-2",
          author: "Rafael Nunes",
          body: "O teste de feature já existe e reproduz o problema. Não alterar a regra de sessão.",
          createdAt: "2026-11-10T14:22:00.000Z",
        },
        {
          id: "c142-3",
          author: "Você",
          body: "Vou validar o snapshot atual e manter o rascunho de comentário em caso de falha de publicação.",
          createdAt: "2026-11-11T11:30:00.000Z",
        },
      ],
      publishState: "idle",
    },
    {
      id: "issue-119",
      projectId: "atlas",
      repo: "equipe/atlas",
      number: 119,
      title: "Redirecionamento após logout",
      body: issue119Body,
      state: "closed",
      labels: ["investigação"],
      author: "Rafael Nunes",
      updatedAt: "2026-11-10T16:30:00.000Z",
      comments: [
        {
          id: "c119-1",
          author: "Rafael Nunes",
          body: "Investigação encerrada. O checkout de investigação foi removido, mas o histórico permanece.",
          createdAt: "2026-11-10T16:30:00.000Z",
        },
      ],
      publishState: "idle",
    },
    {
      id: "issue-88",
      projectId: "atlas",
      repo: "equipe/atlas",
      number: 88,
      title: "Documentar ambiente de preview",
      body: issue88Body,
      state: "open",
      labels: ["documentação"],
      author: "Marina Duarte",
      updatedAt: "2026-11-09T10:00:00.000Z",
      comments: [],
      publishState: "idle",
    },
    {
      id: "issue-campo-12",
      projectId: "campo",
      repo: "equipe/campo-docs",
      number: 12,
      title: "Guia de instalação Linux",
      body: campoIssueBody,
      state: "open",
      labels: ["docs"],
      author: "Você",
      updatedAt: "2026-11-11T10:00:00.000Z",
      comments: [],
      publishState: "idle",
    },
  ]
}

function makeWorktrees(scenario: DemoState["ui"]["scenario"]): Worktree[] {
  const setupFailed = scenario === "setup-failed"
  return [
    {
      id: "wt-login",
      projectId: "atlas",
      name: "issue-142-login",
      branch: "issue-142-login",
      path: "/srv/atlas/.worktrees/issue-142-login",
      issueId: "issue-142",
      status: setupFailed ? "setup_failed" : "working",
      setup: {
        state: setupFailed ? "failed" : "succeeded",
        exitCode: setupFailed ? 1 : 0,
        output: setupFailed
          ? [
              "> composer run setup",
              "Loading composer repositories with package information",
              "Installing dependencies",
              "Script @php artisan migrate --force handling the post-install-cmd event",
              "SQLSTATE[42S02]: Base table or view not found: 1146 Table 'atlas.jobs' doesn't exist",
              "Script @php artisan migrate --force returned with error code 1",
              "Process exited with code 1",
            ]
          : [
              "> composer run setup",
              "Installing dependencies from lock file",
              "Generating optimized autoload files",
              "Migrating database schema… done",
              "Seeding demonstration fixtures… done",
              "Process exited with code 0",
            ],
        startedAt: T.setup,
      },
      lastActivity: setupFailed ? "2026-11-11T11:43:00.000Z" : "2026-11-11T11:58:05.000Z",
      lastActivityLabel: setupFailed ? "setup falhou" : "última saída há 3 min",
    },
    {
      id: "wt-docs",
      projectId: "atlas",
      name: "docs-api",
      branch: "docs/api-auth",
      path: "/srv/atlas/.worktrees/docs-api",
      issueId: "issue-88",
      status: "integrated",
      setup: {
        state: "succeeded",
        exitCode: 0,
        output: ["> composer run setup", "Process exited with code 0"],
        startedAt: "2026-11-10T15:00:00.000Z",
      },
      lastActivity: "2026-11-10T17:10:00.000Z",
      lastActivityLabel: "integrado · mantido",
      removedFromActive: false,
      integratedAt: "2026-11-10T17:20:00.000Z",
    },
    {
      id: "wt-investigation",
      projectId: "atlas",
      name: "investigate-redirect",
      branch: "investigate/redirect",
      path: "/srv/atlas/.worktrees/investigate-redirect",
      issueId: "issue-119",
      status: "removed",
      setup: {
        state: "succeeded",
        exitCode: 0,
        output: ["> composer run setup", "Process exited with code 0"],
        startedAt: T.yesterday,
      },
      lastActivity: T.yesterday,
      lastActivityLabel: "checkout removido · histórico preservado",
      removedFromActive: true,
    },
    {
      id: "wt-guide",
      projectId: "campo",
      name: "guia-instalacao",
      branch: "docs/guia-instalacao",
      path: "/srv/campo/.worktrees/guia-instalacao",
      issueId: "issue-campo-12",
      status: "review",
      setup: {
        state: "succeeded",
        exitCode: 0,
        output: ["> pnpm install", "Process exited with code 0"],
        startedAt: "2026-11-11T10:00:00.000Z",
      },
      lastActivity: "2026-11-11T10:30:00.000Z",
      lastActivityLabel: "aguardando revisão",
    },
  ]
}

function makeFiles(scenario: DemoState["ui"]["scenario"]): DemoFile[] {
  const loginContent =
    scenario === "review-stale"
      ? loginController.replace(
          "return redirect()->intended('/dashboard');",
          "return redirect('/dashboard');",
        )
      : loginController

  return [
    {
      id: "file-login",
      worktreeId: "wt-login",
      path: "app/Http/Controllers/LoginController.php",
      language: "php",
      content: loginContent,
      version: 7,
      status: "modified",
      size: 1024,
      diff: [
        {
          header: "@@ -18,7 +18,11 @@ class LoginController extends Controller",
          lines: loginControllerDiff
            .split("\n")
            .slice(1)
            .map((text) => ({
              type: text.startsWith("+") ? "add" : text.startsWith("-") ? "remove" : "context",
              text,
            })) as DemoFile["diff"][number]["lines"],
        },
      ],
    },
    {
      id: "file-test",
      worktreeId: "wt-login",
      path: "tests/Feature/LoginRedirectTest.php",
      language: "php",
      content: loginTest,
      version: 3,
      status: "modified",
      size: 1180,
      diff: [
        {
          header: "@@ -12,6 +12,9 @@ class LoginRedirectTest extends TestCase",
          lines: [
            { type: "context", text: "     use RefreshDatabase;" },
            { type: "context", text: "" },
            { type: "add", text: "+    // cobre o retorno à rota original" },
            { type: "add", text: "+    // issue equipe/atlas#142" },
            { type: "context", text: "     public function test_redirects_to_intended_page_after_login(): void" },
          ],
        },
      ],
    },
    {
      id: "file-web",
      worktreeId: "wt-login",
      path: "routes/web.php",
      language: "php",
      content:
        "<?php\n\nuse App\\Http\\Controllers\\LoginController;\nuse Illuminate\\Support\\Facades\\Route;\n\nRoute::get('/reports', fn () => view('reports.index'))->middleware('auth');\nRoute::post('/login', [LoginController::class, 'store'])->name('login.store');\n",
      version: 2,
      status: "unchanged",
      size: 240,
      diff: [],
    },
    {
      id: "file-auth",
      worktreeId: "wt-login",
      path: "app/Http/Middleware/Authenticate.php",
      language: "php",
      content:
        "<?php\n\nnamespace App\\Http\\Middleware;\n\nuse Illuminate\\Auth\\Middleware\\Authenticate as Middleware;\n\nclass Authenticate extends Middleware\n{\n    protected function redirectTo($request): ?string\n    {\n        return $request->expectsJson() ? null : route('login');\n    }\n}\n",
      version: 1,
      status: "added",
      size: 280,
      diff: [
        {
          header: "@@ -0,0 +1,15 @@",
          lines: [
            { type: "add", text: "+<?php" },
            { type: "add", text: "+" },
            { type: "add", text: "+namespace App\\Http\\Middleware;" },
            { type: "add", text: "+" },
            { type: "add", text: "+class Authenticate extends Middleware" },
          ],
        },
      ],
    },
    {
      id: "file-docs",
      worktreeId: "wt-docs",
      path: "docs/api-auth.md",
      language: "markdown",
      content:
        "# API de autenticação\n\nO fluxo usa sessão de servidor. Tokens de integração são fictícios neste demo.\n\n## Retorno\n\nApós autenticar, o usuário volta ao destino original.\n",
      version: 4,
      status: "modified",
      size: 320,
      diff: [
        {
          header: "@@ -1,4 +1,7 @@",
          lines: [
            { type: "context", text: " # API de autenticação" },
            { type: "add", text: "+" },
            { type: "add", text: "+Após autenticar, o usuário volta ao destino original." },
          ],
        },
      ],
    },
    {
      id: "file-guide",
      worktreeId: "wt-guide",
      path: "docs/guia.md",
      language: "markdown",
      content: markdownGuide,
      version: 5,
      status: "modified",
      size: 480,
      diff: [
        {
          header: "@@ -6,7 +6,9 @@",
          lines: [
            { type: "context", text: " 3. Executar o setup do projeto." },
            { type: "add", text: "+" },
            { type: "add", text: "+> Nenhum segredo real deve ser colocado nos exemplos." },
          ],
        },
      ],
    },
    {
      id: "file-config",
      worktreeId: "wt-login",
      path: "config/legacy-auth.php",
      language: "php",
      content: "",
      version: 2,
      status: "unchanged",
      size: 640,
      unavailable: true,
      diff: [],
    },
    {
      id: "file-logo",
      worktreeId: "wt-login",
      path: "public/logo.png",
      language: "text",
      content: "",
      version: 1,
      status: "unchanged",
      binary: true,
      size: 184_320,
      diff: [],
    },
    {
      id: "file-dump",
      worktreeId: "wt-login",
      path: "storage/exports/session-dump.json",
      language: "json",
      content: "",
      version: 1,
      status: "unchanged",
      size: 8_400_000,
      diff: [],
    },
  ]
}

function makeJobs(scenario: DemoState["ui"]["scenario"]): Job[] {
  const running = scenario === "during-run"
  const failed = scenario === "setup-failed"
  const network = scenario === "network"
  return [
    {
      id: "job-tests",
      worktreeId: "wt-login",
      sessionId: "sess-impl",
      name: "testes de autenticação",
      kind: "tool",
      status: failed || network ? "failed" : running ? "running" : "completed",
      objective: "Validar o snapshot de trabalho identificado",
      lastActivity: network
        ? "conexão encerrada · resultado desconhecido"
        : running
          ? "saída recebida há 3 s"
          : "concluído · exit 0",
      startedAt: T.tool,
      output: network
        ? "Sem exit code: a conexão caiu antes da confirmação."
        : running
          ? "PASS  Tests\\Feature\\LoginRedirectTest\n  ✓ redirects to intended page after login\n\nExecutando 12 testes restantes…"
          : "PASS  Tests\\Feature\\LoginRedirectTest\n1 test passed · exit 0",
      progressNote: "Sem percentual inventado.",
      toolCallId: "tool-tests",
    },
    {
      id: "job-review",
      worktreeId: "wt-login",
      sessionId: "sess-impl",
      name: "revisão de login",
      kind: "subagent",
      status: network ? "unknown" : running ? "running" : "completed",
      objective: "Revisar o cenário de autenticação",
      lastActivity: network
        ? "sem confirmação de conclusão"
        : running
          ? "leitura de arquivo · há 40 s"
          : "concluído · resumo entregue",
      startedAt: "2026-11-11T11:58:05.000Z",
      childSessionId: "sess-child",
      output: network
        ? "Resultado não confirmado após a queda de conexão."
        : running
          ? "Inspecionando cenários de autenticação."
          : "1 arquivo revisado, nenhuma escrita. Resumo curto entregue ao pai.",
      progressNote: "Resumo do filho e metadados são exibidos em separado.",
      toolCallId: "tool-review",
    },
  ]
}

function makePr(scenario: DemoState["ui"]["scenario"]): PullRequest {
  if (scenario === "network") {
    return {
      id: "pr-login",
      worktreeId: "wt-login",
      number: 160,
      title: "Corrigir retorno após login",
      head: "issue-142-login",
      base: "main",
      sha: "a1b2c3d",
      reviewedSha: "a1b2c3d",
      state: "unavailable",
      gatesState: "unavailable",
      gates: [],
      mergeMethods: ["merge", "squash"],
      mergeState: "unavailable",
      updatedAt: "2026-11-11T11:55:00.000Z",
      note: "Não foi possível consultar a PR: ambiente reconectando. Última leitura conhecida: 11:51.",
    }
  }

  if (scenario === "review-stale") {
    return {
      id: "pr-login",
      worktreeId: "wt-login",
      number: 160,
      title: "Corrigir retorno após login",
      head: "issue-142-login",
      base: "main",
      sha: "a1b2c3d",
      reviewedSha: "9f8e7d6",
      state: "blocked",
      gatesState: "reported",
      gates: [
        {
          id: "gate-lint",
          name: "lint",
          status: "passed",
          required: true,
          source: "github/actions/lint",
          sha: "a1b2c3d",
          detail: "Concluído em 42 s.",
        },
        {
          id: "gate-tests",
          name: "testes",
          status: "failed",
          required: true,
          source: "github/actions/tests",
          sha: "a1b2c3d",
          detail: "1 falha: LoginRedirectTest.",
        },
        {
          id: "gate-preview",
          name: "deploy-preview",
          status: "running",
          required: false,
          source: "github/actions/preview",
          sha: "a1b2c3d",
          detail: "Execução em andamento; não bloqueia por ser opcional.",
        },
      ],
      mergeMethods: ["merge", "squash"],
      mergeState: "blocked",
      updatedAt: "2026-11-11T11:56:00.000Z",
      note: "Evidência desatualizada: o SHA revisado é anterior ao head atual. Revalidar antes de integrar.",
    }
  }

  return {
    id: "pr-login",
    worktreeId: "wt-login",
    number: 160,
    title: "Corrigir retorno após login",
    head: "issue-142-login",
    base: "main",
    sha: "a1b2c3d",
    reviewedSha: "a1b2c3d",
    state: "open",
    gatesState: "reported",
    gates: [
      {
        id: "gate-lint",
        name: "lint",
        status: "passed",
        required: true,
        source: "github/actions/lint",
        sha: "a1b2c3d",
        detail: "Concluído em 38 s.",
      },
      {
        id: "gate-tests",
        name: "testes",
        status: "running",
        required: true,
        source: "github/actions/tests",
        sha: "a1b2c3d",
        detail: "Executando 18 testes.",
      },
      {
        id: "gate-preview",
        name: "deploy-preview",
        status: "running",
        required: false,
        source: "github/actions/preview",
        sha: "a1b2c3d",
        detail: "Aguardando runner.",
      },
    ],
    mergeMethods: ["squash"],
    mergeState: "idle",
    updatedAt: "2026-11-11T11:57:00.000Z",
    note: "Merge commit não está habilitado nesta fixture; apenas squash é permitido.",
  }
}

function makeProcesses(scenario: DemoState["ui"]["scenario"]): ProcessGroup[] {
  const offline = scenario === "network"
  return [
    {
      id: "proc-preview",
      worktreeId: "wt-login",
      origin: "Preview app / serviço-1",
      kind: "preview",
      status: offline ? "unknown" : "expected",
      cpu: offline ? null : 1,
      memory: offline ? null : 150,
      command: "node server.js --port 3100",
      since: "2026-11-11T11:43:00.000Z",
      reason: "Serviço persistente esperado enquanto o preview estiver habilitado.",
      scope: "preview do worktree · pode ser encerrado pelo painel",
      attribution: "confirmed",
    },
    {
      id: "proc-playwright",
      worktreeId: "wt-login",
      origin: "Playwright / job-tests",
      kind: "browser",
      status: offline ? "unknown" : "suspicious",
      cpu: offline ? null : 25,
      memory: offline ? null : 600,
      command: "chromium --headless --remote-debugging-port=0",
      since: "2026-11-11T11:56:50.000Z",
      reason: "Job encerrado, mas dois browsers associados continuam vivos.",
      scope: "somente o grupo do job-tests",
      attribution: "confirmed",
      children: ["chromium renderer", "playwright driver"],
    },
    {
      id: "proc-shell",
      worktreeId: "wt-login",
      origin: "shell / terminal-1",
      kind: "shell",
      status: "expected",
      cpu: 0,
      memory: 20,
      command: "bash (terminal de demonstração)",
      since: "2026-11-11T11:44:00.000Z",
      reason: "Processo esperado do terminal gerenciado.",
      scope: "terminal-1",
      attribution: "confirmed",
    },
    {
      id: "proc-external",
      worktreeId: "wt-login",
      origin: "Origem não atribuída",
      kind: "external",
      status: "unknown",
      cpu: null,
      memory: null,
      command: "processo compartilhado do host",
      since: "horário não disponível",
      reason: "Atribuição apenas por melhor esforço; sem botão de encerramento.",
      scope: "fora do escopo do worktree",
      attribution: "best-effort",
    },
  ]
}

function makeTerminals(scenario: DemoState["ui"]["scenario"]): DemoState["terminals"] {
  const ended = scenario === "network"
  return [
    {
      id: "term-1",
      worktreeId: "wt-login",
      title: "Setup · issue-142-login",
      status: ended ? "ended" : "connected",
      stateLabel: ended
        ? "sem shell conectada · PTY encerrado simulado"
        : "sem shell conectada · saída reproduzida",
      output: [
        "> composer run setup",
        "Installing dependencies from lock file",
        "Generating optimized autoload files",
        "Migrating database schema… done",
        "Seeding demonstration fixtures… done",
        "Process exited with code 0",
      ],
      truncated: false,
    },
    {
      id: "term-2",
      worktreeId: "wt-login",
      title: "Testes · job-tests",
      status: "connected",
      stateLabel: "saída de ferramenta em background · não é shell interativa",
      output: [
        "$ php artisan test tests/Feature/LoginRedirectTest.php",
        "PASS  Tests\\Feature\\LoginRedirectTest",
        "  ✓ redirects to intended page after login",
        "",
        "Tests:    1 passed",
        "Time:     0.42s",
      ],
      truncated: false,
    },
  ]
}

function makePreview(scenario: DemoState["ui"]["scenario"]): DemoState["previews"] {
  const offline = scenario === "network"
  return [
    {
      id: "preview-1",
      worktreeId: "wt-login",
      title: "App web · issue-142-login",
      status: offline ? "offline" : "ready",
      access: "private",
      url: "https://atlas.privado.exemplo/issue-142-login",
      detail: offline
        ? "Ambiente reconectando. O último acesso conhecido não é prova de disponibilidade atual."
        : "Acesso pela rede privada do ambiente. Nenhuma porta foi aberta por este demo.",
    },
    {
      id: "preview-2",
      worktreeId: "wt-login",
      title: "Storybook · componentes",
      status: "revoked",
      access: "public",
      url: "https://preview.exemplo.invalid/atlas",
      detail: "Acesso revogado e URL pública ilustrativa. O demo não abre esta URL.",
    },
  ]
}

function makeSettings(): SettingsState {
  return {
    modes: [
      {
        id: "mode-build",
        name: "build",
        description: "Implementa código e executa testes do worktree.",
        tools: "leitura, busca, patch, shell",
        permission: "edição em código; comandos sensíveis pedem aprovação",
      },
      {
        id: "mode-review",
        name: "review",
        description: "Revisa o diff e produz evidência vinculada ao SHA.",
        tools: "leitura, busca, diff",
        permission: "somente leitura",
      },
      {
        id: "mode-planner",
        name: "planner",
        description: "Planeja e escreve documentação permitida.",
        tools: "leitura, busca, escrita em docs",
        permission: "escrita restrita a docs",
      },
      {
        id: "mode-chat",
        name: "chat",
        description: "Conversa sem ferramentas de escrita.",
        tools: "leitura",
        permission: "somente leitura",
      },
    ],
    mcp: [
      {
        id: "mcp-docs",
        name: "docs-local",
        target: "Linux-A · stdio",
        status: "connected",
        tools: 3,
        note: "Ferramentas de leitura; nenhuma chamada externa neste demo.",
      },
      {
        id: "mcp-issues",
        name: "issues-read",
        target: "Linux-A · stdio",
        status: "disabled",
        tools: null,
        note: "Desabilitado. Nenhuma conexão real foi configurada.",
      },
    ],
    permissionProfile:
      "Leitura/busca permitidas; edição conforme modo; comandos sensíveis sob aprovação; publicação, integração e descarte exigem autorização explícita.",
    contextPolicy:
      "Limite do modelo identificado; reserva de saída de 8k; compactação proposta, nunca silenciosa.",
    retention:
      "Sessões, evidências e anexos são preservados após remover um worktree. Exclusão definitiva seria uma ação separada.",
    access: {
      sessions: [
        {
          id: "dev-1",
          device: "Este navegador · janela de demonstração",
          trust: "untrusted",
          lastSeen: "2026-11-11T11:50:00.000Z",
          expires: "15 min de inatividade · teto de 1 h",
        },
        {
          id: "dev-2",
          device: "Tablet pessoal · exemplo",
          trust: "trusted",
          lastSeen: "2026-11-10T20:00:00.000Z",
          expires: "30 dias de inatividade · teto de 90 dias",
        },
        {
          id: "dev-3",
          device: "Navegador antigo · exemplo",
          trust: "expired",
          lastSeen: "2026-10-02T09:00:00.000Z",
          expires: "expirado · reautenticação necessária",
        },
      ],
    },
  }
}

function makeBaseState(scenario: DemoState["ui"]["scenario"]): DemoState {
  return {
    projects: [
      {
        id: "atlas",
        name: "Atlas",
        repo: "equipe/atlas",
        description:
          "Aplicação interna de relatórios. Projeto de demonstração com fixture de autenticação.",
        baseBranch: "main",
        environment: "Linux-A",
        environmentState: scenario === "network" ? "offline" : "connected",
        connection: "Go pessoal · deepseek-v4.1-flash",
        setupCommand: "composer run setup",
        integrationRite: "pr",
      },
      {
        id: "campo",
        name: "Campo",
        repo: "equipe/campo-docs",
        description: "Documentação operacional do ambiente Linux-B. Conteúdo inteiramente fictício.",
        baseBranch: "main",
        environment: "Linux-B",
        environmentState: "degraded",
        connection: "Go pessoal · deepseek-v4.1-flash",
        setupCommand: "pnpm install",
        integrationRite: "local-push",
      },
    ],
    worktrees: makeWorktrees(scenario),
    sessions: makeSessions(scenario),
    issues: makeIssues(),
    files: makeFiles(scenario),
    jobs: makeJobs(scenario),
    prs: [makePr(scenario)],
    processes: makeProcesses(scenario),
    terminals: makeTerminals(scenario),
    previews: makePreview(scenario),
    connections: [
      {
        id: "conn-go",
        name: "Go pessoal",
        provider: "OpenCode Go",
        plan: "Go · modalidade ilustrativa",
        holder: "Você",
        keyState: "não validada neste demo",
        catalogState: "catálogo público de exemplo · não valida a chave",
        extraUsage: "unknown",
        extraUsageNote:
          "Estado não verificado. O demo não consulta cobrança e não calcula saldo por conta própria.",
        sessionUsage: {
          input: 45_210,
          output: 6_800,
          cache: 21_800,
        },
        context: { used: 18_400, limit: 128_000 },
        quotaWindows: [
          {
            id: "q-5h",
            label: "Janela de 5 horas",
            used: 62,
            remaining: 38,
            resetAt: "2026-11-11T14:00:00.000Z",
            source: "Exemplo fictício do cenário · sem consulta ao provedor",
            readAt: "2026-11-11T11:58:00.000Z",
          },
          {
            id: "q-week",
            label: "Semanal",
            used: 38,
            remaining: 62,
            resetAt: "2026-11-17T00:00:00.000Z",
            source: "Exemplo fictício do cenário · sem consulta ao provedor",
            readAt: "2026-11-11T11:58:00.000Z",
          },
          {
            id: "q-month",
            label: "Mensal",
            used: 24,
            remaining: 76,
            resetAt: "2026-12-01T00:00:00.000Z",
            source: "Exemplo fictício do cenário · sem consulta ao provedor",
            readAt: "2026-11-11T11:58:00.000Z",
          },
        ],
      },
      {
        id: "conn-zai",
        name: "Z.AI pessoal",
        provider: "Z.AI",
        plan: "Coding Plan · ilustrativo",
        holder: "Você",
        keyState: "não validada neste demo",
        catalogState: "catálogo de exemplo · não valida a chave",
        extraUsage: "unknown",
        extraUsageNote:
          "Estado não verificado. Nenhuma cobrança é consultada ou calculada pelo demo.",
        sessionUsage: {
          input: 12_000,
          output: 2_100,
          cache: 0,
        },
        context: { used: 42_000, limit: 200_000 },
        quotaWindows: [
          {
            id: "q-5h",
            label: "Janela de 5 horas",
            used: 31,
            remaining: 69,
            resetAt: "2026-11-11T15:30:00.000Z",
            source: "Exemplo fictício do cenário · sem consulta ao provedor",
            readAt: "2026-11-11T11:58:00.000Z",
          },
          {
            id: "q-week",
            label: "Semanal",
            used: 12,
            remaining: 88,
            resetAt: "2026-11-18T00:00:00.000Z",
            source: "Exemplo fictício do cenário · sem consulta ao provedor",
            readAt: "2026-11-11T11:58:00.000Z",
          },
          {
            id: "q-month",
            label: "Mensal",
            used: null,
            remaining: null,
            resetAt: null,
            source: "Fonte externa indisponível",
            readAt: null,
          },
        ],
      },
    ],
    settings: makeSettings(),
    ui: {
      scenario,
      sim: {
        tick: 0,
        playing: false,
        totalTicks:
          scenario === "during-run" ? 5 : scenario === "network" ? 3 : 2,
      },
      drafts: {},
      composerSources: {},
      queue: [],
      issueOverlay: {
        open: false,
        issueId: "issue-142",
        mobileView: "detail",
        triggerLabel: null,
      },
      issueCommentDrafts: {},
      fileBuffers: {},
      activeSessionByWorktree: {
        "wt-login": "sess-impl",
        "wt-docs": "sess-docs",
        "wt-investigation": "sess-investigation",
        "wt-guide": "sess-campo",
      },
      selectedFileByWorktree: {
        "wt-login": "file-login",
        "wt-docs": "file-docs",
        "wt-guide": "file-guide",
      },
      search: {
        query: "",
        mode: "terms",
        scope: "all",
        projectId: null,
        worktreeId: null,
        includeSubagents: true,
        openedResultId: null,
      },
      lastStreamChunk: {},
      assistantStream: "",
      terminalTick: 0,
      resetCount: 0,
    },
  }
}

export function createInitialState(scenario: DemoState["ui"]["scenario"] = "normal"): DemoState {
  const state = makeBaseState(scenario)

  if (scenario === "during-run") {
    const queuedContent = "Também preserve o retorno anterior para /reports."
    state.sessions = state.sessions.map((session) =>
      session.id === "sess-impl"
        ? {
            ...session,
            messages: [
              ...session.messages,
              {
                id: "msg-queued-continuation",
                sessionId: "sess-impl",
                role: "user",
                content: queuedContent,
                createdAt: "2026-11-11T11:59:10.000Z",
                deliveryState: "admitted",
                deliveryPreference: "next-safe",
              },
            ],
          }
        : session,
    )
    state.ui.queue = [
      {
        id: "queue-initial",
        sessionId: "sess-impl",
        messageId: "msg-queued-continuation",
        content: queuedContent,
        sources: [],
        admittedAt: "2026-11-11T11:59:10.000Z",
        state: "admitted",
        preference: "next-safe",
        note: "Aguardando o próximo ponto seguro.",
      },
    ]
  }

  if (scenario === "setup-failed") {
    state.worktrees = state.worktrees.map((worktree) =>
      worktree.id === "wt-login"
        ? { ...worktree, status: "setup_failed", lastActivityLabel: "setup falhou" }
        : worktree,
    )
    state.sessions = state.sessions.map((session) =>
      session.id === "sess-impl" ? { ...session, status: "interrupted" } : session,
    )
    state.jobs = state.jobs.map((job) =>
      job.id === "job-tests"
        ? {
            ...job,
            status: "failed",
            lastActivity: "não iniciado: setup falhou",
            output: "O job não foi executado. A sessão não está pronta.",
          }
        : job,
    )
  }

  return state
}

export function sourceForFile(file: DemoFile): SourceRef {
  const error = file.unavailable
    ? "Conteúdo indisponível nesta fixture. Remova a fonte ou tente novamente."
    : file.binary
      ? "Arquivo binário: o conteúdo não é incorporado ao prompt."
      : (file.size ?? 0) > 1_000_000
        ? "Arquivo grande: seria necessário um recorte explícito antes do envio."
        : undefined
  return {
    id: `src-file-${file.id}`,
    kind: "file",
    label: file.path.split("/").at(-1) ?? file.path,
    detail: `${file.path} · v${file.version}`,
    path: file.path,
    version: file.version,
    provenance: "Snapshot do worktree no envio",
    content: error ? undefined : file.content,
    error,
  }
}

export function sourceForIssue(issue: Issue): SourceRef {
  return {
    id: `src-issue-${issue.id}`,
    kind: "issue",
    label: `${issue.repo}#${issue.number}`,
    detail: `${issue.title} · ${issue.state === "open" ? "aberta" : "encerrada"}`,
    repo: issue.repo,
    issueNumber: issue.number,
    provenance: `Descrição + ${issue.comments.length}/${issue.comments.length} comentários carregados`,
    content: issue.body,
  }
}

export function buildSearchIndex(state: DemoState): SearchResult[] {
  const results: SearchResult[] = []

  for (const session of state.sessions) {
    const worktree = state.worktrees.find((item) => item.id === session.worktreeId)
    const project = state.projects.find((item) => item.id === worktree?.projectId)
    if (!worktree || !project) continue

    for (const message of session.messages) {
      const text = message.tool
        ? `${message.content} ${message.tool.name} ${message.tool.args} ${message.tool.output ?? ""}`
        : message.content
      const kind = message.tool ? "tool" : "message"
      results.push({
        id: `${session.id}:${message.id}`,
        projectId: project.id,
        worktreeId: worktree.id,
        sessionId: session.id,
        messageId: message.id,
        kind,
        title: `${session.title} · ${kind === "tool" ? message.tool?.name : "mensagem"}`,
        snippet: text.slice(0, 280),
        matchStart: 0,
        matchLength: 0,
        createdAt: message.createdAt,
        removedWorktree: worktree.status === "removed",
        subagent: Boolean(session.parentSessionId),
        anchor: message.anchor ?? message.id,
      })
    }

    for (const job of state.jobs.filter((item) => item.sessionId === session.id)) {
      results.push({
        id: `${session.id}:job:${job.id}`,
        projectId: project.id,
        worktreeId: worktree.id,
        sessionId: session.id,
        messageId: job.id,
        kind: "job",
        title: `Job · ${job.name}`,
        snippet: `${job.objective} ${job.output}`,
        matchStart: 0,
        matchLength: 0,
        createdAt: job.startedAt,
        removedWorktree: worktree.status === "removed",
        subagent: job.kind === "subagent",
        anchor: job.id,
      })
    }
  }

  for (const file of state.files) {
    const worktree = state.worktrees.find((item) => item.id === file.worktreeId)
    const project = state.projects.find((item) => item.id === worktree?.projectId)
    const session = state.sessions.find((item) => item.worktreeId === file.worktreeId)
    if (!worktree || !project || !session) continue
    results.push({
      id: `file:${file.id}`,
      projectId: project.id,
      worktreeId: worktree.id,
      sessionId: session.id,
      messageId: file.id,
      kind: "file",
      title: `Arquivo · ${file.path}`,
      snippet: `${file.path} ${file.status}`,
      matchStart: 0,
      matchLength: 0,
      createdAt: worktree.lastActivity,
      removedWorktree: worktree.status === "removed",
      subagent: false,
      anchor: file.path,
    })
  }

  for (const issue of state.issues) {
    const project = state.projects.find((item) => item.id === issue.projectId)
    const worktree = state.worktrees.find((item) => item.issueId === issue.id)
    const session = state.sessions.find((item) => item.worktreeId === worktree?.id)
    if (!project || !worktree || !session) continue
    results.push({
      id: `issue:${issue.id}`,
      projectId: project.id,
      worktreeId: worktree.id,
      sessionId: session.id,
      messageId: issue.id,
      kind: "issue",
      title: `Issue · ${issue.repo}#${issue.number}`,
      snippet: `${issue.title} ${issue.body}`,
      matchStart: 0,
      matchLength: 0,
      createdAt: issue.updatedAt,
      removedWorktree: worktree.status === "removed",
      subagent: false,
      anchor: `issue-${issue.number}`,
    })
  }

  return results
}
