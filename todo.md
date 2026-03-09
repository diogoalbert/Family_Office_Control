# Family Office Management Platform - TODO

## Banco de Dados
- [x] Schema: tabela teamMembers
- [x] Schema: tabela tasks (com semana, status, pendingReason, responsibleId)
- [x] Schema: tabela documents (metadados, filepath, uploaderId)
- [x] Schema: tabela documentChunks (para RAG - texto, embedding vetorial)
- [x] Migração do banco de dados (pnpm db:push)

## Backend (tRPC Routers)
- [x] Router: teamMembers (list, create, update, delete)
- [x] Router: tasks (list por membro/semana, create, updateStatus, delete)
- [x] Router: documents (list, upload via S3, delete)
- [x] Router: chat (RAG - pergunta + busca vetorial + resposta IA)
- [x] Processamento de PDF em background (extração de texto + embeddings)
- [x] Notificações automáticas: tarefas pendentes > 2 dias
- [x] Notificações automáticas: sprint semanal concluído

## Frontend - Design System
- [x] Paleta de cores elegante (dark theme com acentos dourados)
- [x] Tipografia refinada (Google Fonts)
- [x] Componentes base (cards, badges de status, modais)

## Frontend - Páginas
- [x] Layout com DashboardLayout (sidebar elegante)
- [x] Página: Dashboard principal com resumo e métricas
- [x] Página: Gráfico de Gantt (6 semanas × membros)
- [x] Página: Gestão de Tarefas por membro com tabela
- [x] Página: Modal de atualização de status com justificativa
- [x] Página: Repositório de Documentos com upload
- [x] Página: Chat com IA (RAG)
- [x] Página: Gestão de Membros da Equipe

## Integrações
- [x] Upload de arquivos para S3 (armazenamento)
- [x] Processamento RAG: extração de texto de PDFs
- [x] Embeddings via API de IA
- [x] Chat com contexto RAG (busca vetorial + LLM)

## Testes
- [x] Testes vitest para routers principais
- [x] Validação de endpoints (15 testes passando)

## Entrega
- [x] Checkpoint final
- [ ] Publicação
