# Jarvis — operação do Brain migrado

Registro de 11/11/2026. Migração do ambiente de desenvolvimento do Mac para o servidor Linux
`jarvis`. O `movs-v2` não foi alterado; o Brain usa banco e serviço próprios.

> **Estado:** app real rodando em `http://jarvis.tail753f8d.ts.net:3000` e também em
> `http://100.111.66.95:3000`, acessível pela tailnet. HTTPS via Tailscale Serve ainda **não** está
> habilitado: a tailnet exige habilitar Serve pelo painel/login do proprietário. O serviço é nativo
> (Node + PostgreSQL); Docker/Compose não existe neste host.

## 1. Acesso

- URL atual: **http://jarvis.tail753f8d.ts.net:3000**
- Usuário criado no setup: `wellington@example.test`
- Senha inicial: arquivo local **`/home/jarvis/Workspace/brain/.admin-password`** (modo 600).
  Leia via SSH e troque pela aba Configurações → Acesso → Trocar senha.
- O token de setup foi consumido e não foi armazenado.
- A URL HTTP é privada da tailnet, mas não é HTTPS. Não usar como implantação pública e não
  habilitar Funnel.

## 2. Serviço

```bash
systemctl --user status brain.service
systemctl --user restart brain.service
journalctl --user -u brain.service -f
curl http://100.111.66.95:3000/api/health
```

- Unit: `/home/jarvis/.config/systemd/user/brain.service`
- `enabled` e `Linger=yes`: deve subir após logout/reboot do usuário.
- `NODE_ENV=production`, `Restart=on-failure`.
- Node: `~/.nvm/versions/node/v24.21.0/bin/node`.
- App: `/home/jarvis/Workspace/brain/dist-server/server/src/index.js`.
- Logs não contêm cookies/senhas; não logar `.env` nem `.admin-password`.

## 3. Banco

- PostgreSQL 17.11 nativo do host; nada publicado pelo app.
- Role: `brain`; bancos: `brain` e `brain_test`.
- `movs`/`movs-v2` não foram alterados; o role/db do Brain são separados.
- Credenciais em `/home/jarvis/Workspace/brain/.env` (modo 600), não versionado.
- Migrações rodam no startup da API e via `npm run db:migrate`.
- Backup manual recomendado antes de mudanças de schema:

```bash
cd /home/jarvis/Workspace/brain
pg_dump -Fc "$DATABASE_URL" > /home/jarvis/brain-$(date +%F).dump
```

## 4. Código e documentação privada

- Repositório: `/home/jarvis/Workspace/brain`.
- Commits atuais: `bd5604b` (M2-A), `725e7a2`, `e1535c4` (teste multiplataforma), `9fd5e21`,
  `af54e05`. O histórico foi reescrito para remover `docs/dev/evidencias` de todos os commits e
  enviado com `force-with-lease`; `origin/main` agora aponta para `af54e05`.
- O GitHub pode manter blobs inalcançáveis em cache até a coleta interna; eles não estão em nenhum
  ref/branch do repositório.
- `docs/plano/`, `README.md`, `.research/` e `docs/dev/evidencias/` foram copiados à parte porque
  são ignorados de propósito. O `.git/info/exclude` local foi preservado.
- `.git.initial-backup` do repositório vazio original foi movido para
  `/home/jarvis/Workspace/.brain-git-initial-backup`.
- Evidências são locais e não versionadas; os markdown não embutem mais imagens que quebrariam em
  um clone.

## 5. Tailscale e HTTPS

O estado atual usa `HOST=100.111.66.95`, `BETTER_AUTH_URL` no DNS e
`BRAIN_PUBLIC_ORIGIN` no IP; as duas origens são aceitas. Como o acesso é HTTP, os cookies estão
sem `Secure`. É uma medida temporária de desenvolvimento privado; habilitar HTTPS exige decidir se
o IP continuará aceito (cookies `Secure` não são enviados em HTTP).

Para habilitar HTTPS privado via Serve (sem Funnel):

1. Habilitar Serve na tailnet pelo link exibido por
   `tailscale serve --bg --https=443 http://100.111.66.95:3000` (ou no painel Tailscale). O comando
   atual retorna **“Serve is not enabled on your tailnet”** e exige login do proprietário; não é
   possível habilitar apenas por SSH/sem essa conta.
2. Publicar o destino interno:
   ```bash
   tailscale serve --bg --https=443 http://100.111.66.95:3000
   tailscale serve status
   ```
3. Editar `/home/jarvis/Workspace/brain/.env`:
   ```text
   BETTER_AUTH_URL=https://jarvis.tail753f8d.ts.net
   BRAIN_PUBLIC_ORIGIN=http://100.111.66.95:3000
   BRAIN_SECURE_COOKIES=false   # mantenha false enquanto o IP HTTP for aceito
   ```
   Manter `HOST=100.111.66.95` e `PORT=3000` (o Serve alcança esse destino). Se quiser cookies
   `Secure`, remova o IP das origens e use somente o DNS HTTPS.
4. `systemctl --user restart brain.service`.
5. Entrar novamente em `https://jarvis.tail753f8d.ts.net/` e revalidar o cookie de dispositivo.

Não usar `tailscale funnel`; não expor a porta 3000 na internet.

## 6. Validação executada no jarvis

| Verificação | Resultado |
| --- | --- |
| `npm ci` com Node 24.21.0 | passou |
| `npm run build` | passou; aviso de chunk >500 kB |
| `npm run db:migrate` | passou; health `db:up`/migrations current |
| `npm test` | 40 testes passaram |
| `npm run test:server` | 16 testes passaram contra `brain_test` |
| `npm run test:e2e -- --workers=2` | 37 testes passaram |
| Login/sessão via browser real | passou; sem erros de console |
| Restart do serviço | passou; health voltou |
| Login via DNS e via IP | ambos 200; sessões isoladas por host |

Com 4 workers, um teste de composer estourou timeout uma vez por contenção; com 2 workers passou.
No Mac, a suíte completa passou com 4 workers.

## 7. Limitações e pendências

- Tailscale Serve/HTTPS ainda não habilitado; acesso atual é HTTP privado na tailnet, tanto pelo
  DNS quanto pelo IP. Cookies não têm `Secure` nesse modo.
- O IP e o DNS têm cookies/sessões separados (host-only); entrar em um não autentica o outro.
- Docker/Compose não instalado no jarvis; o caminho validado aqui é Node nativo + PostgreSQL.
  `Dockerfile`/`compose.yaml` continuam sem execução neste host.
- Reboot completo do host não foi executado; `Linger=yes` e unit `enabled` estão configurados.
- Backup/restauração continuam responsabilidade do operador; não há ferramenta gerenciada.
- Sem validação física de telefone/leitor de tela; Linux/Chromium foi exercitado.
- O `movs-v2` não foi tocado; qualquer alteração nele exige trabalho separado.
- Push para o GitHub, deploy público e M2-B não foram iniciados.

## 8. Rollback básico

- Código: `git -C /home/jarvis/Workspace/brain log --oneline`; reverter para o commit desejado.
- Serviço: `systemctl --user stop brain.service`.
- Banco: restaurar um dump com `pg_restore` em banco vazio, ou recriar `brain` e refazer o setup.
- Tailscale Serve: `tailscale serve reset` remove a configuração (não afeta o app local).
