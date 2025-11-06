# 🚀 Guia de Migração para Cloudflare Pages

Este guia explica como migrar seu sistema de controle de jurados do Express.js/SQLite para Cloudflare Pages com D1.

## 📋 Pré-requisitos

1. Conta no Cloudflare (gratuita)
2. Git instalado
3. Wrangler CLI instalado: `npm install -g wrangler`
4. Node.js instalado (para desenvolvimento local)

## 🔧 Passo 1: Criar Banco de Dados D1

1. Acesse o [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vá em **Workers & Pages** > **D1**
3. Clique em **Create database**
4. Nome: `controle-jurados-db`
5. **Copie o Database ID** gerado

## 📝 Passo 2: Criar Schema do Banco

1. Execute o schema SQL no seu banco D1:

```bash
wrangler d1 execute controle-jurados-db --file=./cloudflare-pages/schema.sql
```

Ou via Dashboard:
- Vá em **Workers & Pages** > **D1** > Seu banco
- Clique em **Console**
- Cole o conteúdo de `schema.sql` e execute

## 🔄 Passo 3: Migrar Dados (Opcional)

Se você já tem dados no SQLite, você pode exportá-los e importá-los:

```bash
# Exportar do SQLite
sqlite3 database/controle_jurados.db .dump > dump.sql

# Adaptar o dump para D1 (remover comandos não suportados)
# E então importar via wrangler ou dashboard
```

## 🌐 Passo 4: Configurar Projeto no Cloudflare Pages

1. No Cloudflare Dashboard, vá em **Workers & Pages** > **Pages**
2. Clique em **Create a project** > **Connect to Git**
3. Conecte seu repositório GitHub/GitLab/Bitbucket
4. Configure:
   - **Project name**: `controle-jurados`
   - **Production branch**: `main` (ou `master`)
   - **Build command**: *(deixe vazio - não precisa build)*
   - **Build output directory**: `cloudflare-pages/dist` ou a pasta onde estão seus arquivos HTML

## ⚙️ Passo 5: Configurar Bindings

1. No projeto criado, vá em **Settings** > **Functions**
2. Em **D1 Database Bindings**, clique em **Add binding**:
   - **Variable name**: `DB` (exatamente assim)
   - **D1 database**: Selecione `controle-jurados-db`
3. Salve as configurações

## 📁 Passo 6: Estrutura de Arquivos

Organize seus arquivos assim:

```
cloudflare-pages/
├── dist/                    # Arquivos estáticos (HTML, CSS, JS)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── images/
├── functions/               # Cloudflare Functions (API)
│   └── api/
│       └── jurados.js
├── schema.sql               # Schema do banco
├── wrangler.toml            # Configuração
└── GUIA-MIGRACAO.md         # Este arquivo
```

## 🔐 Passo 7: Adaptar Autenticação

O sistema original usa sessões Express. Para Cloudflare Pages, você pode:

1. **Usar JWT (Recomendado)**:
   - Gerar tokens JWT no login
   - Armazenar no localStorage do navegador
   - Enviar no header `Authorization` nas requisições

2. **Usar Cloudflare KV**:
   - Armazenar sessões no KV
   - Usar cookies HTTP-only

## 📝 Passo 8: Converter Views EJS para HTML/JS

As views EJS precisam ser convertidas para:
- HTML estático (para páginas simples)
- SPA (Single Page Application) com JavaScript (para páginas dinâmicas)

Exemplo de conversão:
- `views/jurados/index.ejs` → `dist/jurados.html` + `dist/js/jurados.js`
- O JavaScript faz chamadas para `/api/jurados` (Cloudflare Functions)

## 🚀 Passo 9: Deploy

1. Faça commit e push para o repositório:
```bash
git add cloudflare-pages/
git commit -m "Migração para Cloudflare Pages"
git push
```

2. O Cloudflare Pages fará deploy automaticamente

3. Acesse a URL gerada: `https://controle-jurados.pages.dev`

## 🔍 Passo 10: Testar

1. Teste todas as funcionalidades:
   - Login
   - Listar jurados
   - Criar jurado
   - Editar jurado
   - Excluir jurado
   - Outras funcionalidades...

2. Verifique os logs no Cloudflare Dashboard

## ⚠️ Diferenças Importantes

### SQLite vs D1

- **SQLite**: Suporta `RETURNING` em alguns casos
- **D1**: Não suporta `RETURNING`, use `last_row_id` após INSERT

### Express vs Cloudflare Workers

- **Express**: Middleware, req.body, req.params
- **Workers**: `context.request`, `context.params`, `context.env`

### Sessões

- **Express**: `express-session` com cookies
- **Cloudflare**: JWT ou KV para sessões

## 🆘 Problemas Comuns

### Erro: "DB is not defined"
- Verifique se o binding está configurado corretamente
- O nome deve ser exatamente `DB` no código

### Erro: "Database not found"
- Verifique se o banco D1 foi criado
- Verifique se o binding está correto

### Dados não aparecem
- Verifique se o schema foi criado
- Verifique se os dados foram migrados
- Verifique os logs no Dashboard

## 📚 Recursos

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Workers Docs](https://developers.cloudflare.com/workers/)

## 💡 Próximos Passos

1. Migrar todas as rotas para Cloudflare Functions
2. Converter todas as views para HTML/JS
3. Implementar autenticação JWT
4. Adicionar testes
5. Configurar domínio personalizado (opcional)

