# Guia de Deploy — Family Office Management Platform

## Visão Geral da Arquitetura

A plataforma usa os seguintes serviços gerenciados pelo Manus:

| Serviço | Descrição |
|---|---|
| **Banco de dados** | MySQL/TiDB em nuvem (gerenciado pelo Manus) |
| **Armazenamento de arquivos** | S3 via proxy Manus (para documentos) |
| **Autenticação** | Manus OAuth (login com conta Manus) |
| **LLM / Embeddings** | API Manus Forge (para Chat com IA e RAG) |

> **Importante:** Rodar localmente requer acesso às APIs do Manus. O banco de dados, o storage S3 e a autenticação são serviços em nuvem — não rodam offline.

---

## Opção 1 — Publicar pelo Manus (Recomendado)

A forma mais simples: clique em **Publish** no painel do Manus. O domínio padrão gerado é:

```
https://famoffice-dash-g64nfpje.manus.space
```

### Vincular domínio próprio do escritório

1. No painel do Manus, vá em **Settings → Domains**
2. Clique em **Add Custom Domain**
3. Digite o domínio desejado, por exemplo: `gestao.mmlaw.pt`
4. O Manus exibirá os registros DNS a configurar no seu provedor de domínio:

```
Tipo    Nome              Valor
CNAME   gestao            cname.manus.space
```

5. Acesse o painel do seu registrador de domínio (GoDaddy, Namecheap, Cloudflare, etc.)
6. Adicione o registro CNAME conforme indicado
7. Aguarde a propagação DNS (geralmente 5–30 minutos)
8. O Manus provisiona o certificado SSL automaticamente

---

## Opção 2 — Rodar Localmente (Desenvolvimento)

### Pré-requisitos

- Node.js 22+
- pnpm (`npm install -g pnpm`)
- Acesso à internet (para APIs Manus)

### 1. Clonar o repositório

```bash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd family_office_dashboard
pnpm install
```

### 2. Configurar variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto:

```env
# Banco de dados (obter no painel Manus → Settings → Database)
DATABASE_URL=mysql://usuario:senha@host:porta/banco

# Autenticação Manus OAuth
VITE_APP_ID=seu_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/oauth
JWT_SECRET=uma_string_secreta_longa_e_aleatoria

# Owner (seu OpenID Manus)
OWNER_OPEN_ID=seu_open_id
OWNER_NAME=Seu Nome

# APIs Manus Forge (LLM, Storage, Embeddings)
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua_chave_forge
VITE_FRONTEND_FORGE_API_KEY=sua_chave_forge_frontend
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im

# Analytics (opcional)
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=

# Ambiente (opcional)
# APP_ENV=test desabilita login para ambiente de testes hospedado
APP_ENV=test
# Alternativa explícita: AUTH_MODE=disabled (sobrepõe APP_ENV/NODE_ENV)
# AUTH_MODE=disabled
```

> **Como obter os valores:** No painel do Manus, vá em **Settings → Secrets** — todos os valores já estão configurados lá. Copie cada um para o seu `.env`.

### 3. Migrar o banco de dados

```bash
pnpm db:push
```

### 4. Rodar em modo desenvolvimento

```bash
pnpm dev
```

Acesse: `http://localhost:3000`

---

## Opção 3 — Deploy em Servidor Próprio (VPS/Docker)

Se o escritório quiser hospedar completamente no próprio servidor:

### Limitações importantes

Os seguintes serviços precisariam ser substituídos:

| Serviço Manus | Alternativa Self-Hosted |
|---|---|
| Banco MySQL/TiDB | MySQL ou PostgreSQL próprio |
| Storage S3 Manus | AWS S3, MinIO, ou Cloudflare R2 |
| Autenticação Manus OAuth | Auth0, Keycloak, ou sistema próprio |
| LLM / Embeddings | OpenAI API direta, ou modelo local (Ollama) |

### Build para produção

```bash
pnpm build
```

Gera:
- `dist/` — servidor Node.js compilado
- `client/dist/` — frontend estático (embutido no servidor)

### Rodar em produção

```bash
NODE_ENV=production node dist/index.js
```

### Exemplo com Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm build
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Nginx como proxy reverso

```nginx
server {
    listen 80;
    server_name gestao.mmlaw.pt;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50m;
    }
}
```

Com SSL via Certbot:
```bash
certbot --nginx -d gestao.mmlaw.pt
```

---

## Recomendação para o Escritório

Para uma equipe jurídica que precisa de acesso seguro via internet com mínimo de manutenção técnica, a **Opção 1 (Manus + domínio próprio)** é a mais indicada:

- Zero configuração de servidor
- SSL automático
- Banco de dados gerenciado com backups
- Escalabilidade automática
- Domínio personalizado do escritório

O custo adicional é apenas o registro do domínio (ex: `gestao.mmlaw.pt` custa ~€10/ano).
