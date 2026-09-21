# Simone Educação Digital

Plataforma para venda e consumo de cursos de organização. O produto reúne site público, área do aluno e painel administrativo em um único monorepo.

## Funcionalidades

1. Catálogo público de cursos e produtos
2. Cadastro, autenticação e recuperação de senha
3. Pagamentos e assinaturas com Stripe
4. Área do aluno com cursos, aulas e materiais
5. Progresso, favoritos e certificados
6. Suporte por chamados e mensagens
7. Painel administrativo para conteúdo, alunos e produtos
8. Armazenamento privado de arquivos no Supabase
9. Vídeos protegidos com Vimeo
10. Auditoria e registros operacionais

## Arquitetura

O monorepo separa o portal administrativo em `apps/admin`, a experiência pública e do aluno em `apps/web` e os recursos compartilhados em `packages`.

Autenticação, banco, envio de email, armazenamento e componentes visuais possuem pacotes próprios. As aplicações consomem esses módulos por contratos compartilhados, reduzindo duplicação e mantendo os limites entre interface e infraestrutura.

## Tecnologias

Next.js 16, React 19, TypeScript, Auth.js, Prisma, PostgreSQL, Supabase Storage, Stripe, Vimeo, Resend, Tailwind CSS e Turborepo.

## Executar localmente

1. Instale o Node.js 20 ou superior
2. Execute `npm install` na raiz
3. Copie `.env.example` para `.env`
4. Preencha as variáveis necessárias
5. Execute `npm run dev`
6. Acesse o painel em `http://localhost:3000`
7. Acesse o site em `http://localhost:3001`

## Verificação

```bash
npm run lint
npm run test:security
npm run build
```

A suíte atual cobre autenticação, autorização, limitação de requisições, pagamentos, arquivos privados, certificados e tarefas agendadas.

## Status

MVP funcional preparado para demonstração técnica. Integrações externas exigem credenciais próprias e não estão incluídas no repositório.

## Uso do código

Código disponibilizado para avaliação técnica. Todos os direitos reservados.
