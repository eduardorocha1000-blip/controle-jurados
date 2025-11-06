# 🚀 Guia de Deploy - Sistema de Controle de Jurados

Este guia explica como fazer o deploy do sistema em plataformas de nuvem gratuitas, permitindo que qualquer pessoa acesse via navegador sem precisar instalar nada e sem manter seu PC ligado 24/7.

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Opção 1: Render.com (Recomendado - Gratuito)](#opção-1-rendercom-recomendado---gratuito)
3. [Opção 2: Railway.app](#opção-2-railwayapp)
4. [Opção 3: Fly.io](#opção-3-flyio)
5. [Configuração de Variáveis de Ambiente](#configuração-de-variáveis-de-ambiente)
6. [Migração do Banco de Dados](#migração-do-banco-de-dados)
7. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

- Conta GitHub (para hospedar o código)
- Conta na plataforma escolhida (Render, Railway ou Fly.io)
- Git instalado no seu PC
- Dados do banco de dados atual (se quiser migrar)

---

## Opção 1: Render.com (Recomendado - Gratuito)

### ✅ Vantagens
- **Plano gratuito disponível** (com algumas limitações)
- Interface simples e intuitiva
- Deploy automático via GitHub
- Disco persistente para banco de dados
- SSL automático (HTTPS)

### ⚠️ Limitações do Plano Gratuito
- Serviço pode "dormir" após 15 minutos de inatividade
- Primeira requisição após dormir pode demorar ~30 segundos
- 512MB RAM
- 1GB de disco

### 📝 Passo a Passo

#### 1. Preparar o Código no GitHub

```bash
# No diretório do projeto
cd C:\Users\cliente\Desktop\Controle-jurados-Server\Controle-jurados

# Inicializar git (se ainda não tiver)
git init

# Adicionar todos os arquivos
git add .

# Fazer commit
git commit -m "Preparar para deploy"

# Criar repositório no GitHub e conectar
git remote add origin https://github.com/SEU_USUARIO/controle-jurados.git
git branch -M main
git push -u origin main
```

#### 2. Criar Conta no Render

1. Acesse: https://render.com
2. Clique em "Get Started for Free"
3. Faça login com sua conta GitHub

#### 3. Criar Novo Web Service

1. No dashboard, clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório GitHub
3. Selecione o repositório `controle-jurados`
4. Configure:
   - **Name**: `controle-jurados`
   - **Region**: Escolha a mais próxima (ex: `São Paulo` se disponível)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

#### 4. Configurar Variáveis de Ambiente

Na seção **"Environment Variables"**, adicione:

```
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
DB_FILENAME=/opt/render/project/src/database/controle_jurados.db
SESSION_SECRET=<gere uma chave secreta aleatória>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app_gmail
SMTP_FROM=Vara Única <vara@tjsc.jus.br>
APP_URL=<será preenchido após o deploy>
```

**⚠️ IMPORTANTE**: 
- Para `SESSION_SECRET`, gere uma chave aleatória: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Para `SMTP_PASS`, use uma **Senha de App do Gmail** (não sua senha normal)
- `APP_URL` será algo como `https://controle-jurados.onrender.com` (preencha após o primeiro deploy)

#### 5. Configurar Disco Persistente

1. Vá em **"Disks"** no menu lateral
2. Clique em **"Create Disk"**
3. Configure:
   - **Name**: `controle-jurados-data`
   - **Mount Path**: `/opt/render/project/src/database`
   - **Size**: `1 GB` (gratuito)
4. Conecte o disco ao seu Web Service

#### 6. Fazer Deploy

1. Clique em **"Create Web Service"**
2. Aguarde o build e deploy (pode levar 5-10 minutos)
3. Após concluir, copie a URL (ex: `https://controle-jurados.onrender.com`)
4. Atualize a variável `APP_URL` com essa URL

#### 7. Executar Migrações

Após o primeiro deploy, execute as migrações do banco:

1. Vá em **"Shell"** no menu do serviço
2. Execute:
```bash
npm run migrate
```

#### 8. Acessar o Sistema

Acesse a URL fornecida pelo Render (ex: `https://controle-jurados.onrender.com`)

---

## Opção 2: Railway.app

### ✅ Vantagens
- $5 de créditos gratuitos mensais
- Deploy muito rápido
- Interface moderna
- Não "dorme" como o Render gratuito

### 📝 Passo a Passo

#### 1. Criar Conta no Railway

1. Acesse: https://railway.app
2. Clique em **"Start a New Project"**
3. Faça login com GitHub

#### 2. Criar Novo Projeto

1. Clique em **"New Project"**
2. Selecione **"Deploy from GitHub repo"**
3. Escolha seu repositório `controle-jurados`

#### 3. Configurar Variáveis de Ambiente

1. Vá em **"Variables"**
2. Adicione as mesmas variáveis do Render (veja seção acima)
3. Ajuste `PORT` para `3000` (Railway usa porta dinâmica, mas definimos 3000)

#### 4. Configurar Volume para Banco de Dados

1. Vá em **"Settings"** → **"Volumes"**
2. Clique em **"Create Volume"**
3. Configure:
   - **Name**: `database`
   - **Mount Path**: `/app/database`
   - **Size**: `1 GB`

#### 5. Executar Migrações

1. Abra o terminal do serviço
2. Execute: `npm run migrate`

#### 6. Acessar

Railway fornece uma URL automática (ex: `https://controle-jurados-production.up.railway.app`)

---

## Opção 3: Fly.io

### ✅ Vantagens
- Plano gratuito generoso
- Performance excelente
- Controle total via CLI

### 📝 Passo a Passo

#### 1. Instalar Fly CLI

```powershell
# No PowerShell (como Administrador)
iwr https://fly.io/install.ps1 -useb | iex
```

#### 2. Fazer Login

```bash
fly auth login
```

#### 3. Criar App

```bash
cd C:\Users\cliente\Desktop\Controle-jurados-Server\Controle-jurados
fly launch
```

Siga as instruções:
- Escolha um nome para o app (ex: `controle-jurados`)
- Escolha região (ex: `gru` para São Paulo)
- Não crie Postgres (usamos SQLite)
- Não copie arquivos (já temos o fly.toml)

#### 4. Criar Volume para Banco

```bash
fly volumes create controle_jurados_data --region gru --size 1
```

#### 5. Configurar Variáveis de Ambiente

```bash
fly secrets set NODE_ENV=production
fly secrets set HOST=0.0.0.0
fly secrets set SESSION_SECRET=<sua_chave_secreta>
fly secrets set SMTP_HOST=smtp.gmail.com
fly secrets set SMTP_PORT=587
fly secrets set SMTP_USER=seu_email@gmail.com
fly secrets set SMTP_PASS=sua_senha_app_gmail
fly secrets set SMTP_FROM="Vara Única <vara@tjsc.jus.br>"
```

#### 6. Fazer Deploy

```bash
fly deploy
```

#### 7. Executar Migrações

```bash
fly ssh console
npm run migrate
exit
```

#### 8. Acessar

```bash
fly open
```

---

## Configuração de Variáveis de Ambiente

### Variáveis Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NODE_ENV` | Ambiente | `production` |
| `PORT` | Porta do servidor | `3000` ou `10000` (Render) |
| `HOST` | Host do servidor | `0.0.0.0` |
| `SESSION_SECRET` | Chave secreta para sessões | Gere com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DB_FILENAME` | Caminho do banco SQLite | `/app/database/controle_jurados.db` |
| `APP_URL` | URL pública do sistema | `https://seu-app.onrender.com` |

### Variáveis de Email (Opcional)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `SMTP_HOST` | Servidor SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Porta SMTP | `587` |
| `SMTP_USER` | Email remetente | `seu_email@gmail.com` |
| `SMTP_PASS` | Senha de App do Gmail | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM` | Nome do remetente | `Vara Única <vara@tjsc.jus.br>` |

**⚠️ IMPORTANTE**: Para Gmail, você precisa criar uma **Senha de App**:
1. Acesse: https://myaccount.google.com/apppasswords
2. Gere uma senha de app
3. Use essa senha (não sua senha normal)

---

## Migração do Banco de Dados

Se você já tem dados no banco local e quer migrar:

### 1. Fazer Backup Local

```bash
# No PowerShell, no diretório do projeto
npm run backup
# Ou copie manualmente: database/controle_jurados.db
```

### 2. Fazer Upload para a Nuvem

**Render.com:**
- Use o Shell do Render para fazer upload via `scp` ou interface web

**Railway:**
- Use o terminal do Railway para fazer upload

**Fly.io:**
```bash
fly ssh sftp shell
put database/controle_jurados.db /app/database/
```

### 3. Verificar Permissões

Certifique-se de que o arquivo do banco tem permissões corretas:
```bash
chmod 644 database/controle_jurados.db
```

---

## Troubleshooting

### Problema: "Cannot find module"

**Solução**: Certifique-se de que todas as dependências estão no `package.json` e que o `npm install` foi executado.

### Problema: Banco de dados não persiste

**Solução**: 
- Verifique se o volume/disco está montado corretamente
- Certifique-se de que `DB_FILENAME` aponta para o caminho do volume

### Problema: Serviço "dorme" no Render

**Solução**: 
- No plano gratuito, isso é normal após 15 minutos de inatividade
- Considere fazer upgrade para plano pago ($7/mês) ou usar Railway/Fly.io

### Problema: Erro de migração

**Solução**: Execute manualmente via shell/terminal da plataforma:
```bash
npm run migrate
```

### Problema: Email não funciona

**Solução**:
- Verifique se está usando Senha de App do Gmail (não senha normal)
- Verifique se as variáveis SMTP estão corretas
- Teste a conexão SMTP

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs da plataforma
2. Verifique as variáveis de ambiente
3. Teste localmente primeiro
4. Consulte a documentação da plataforma escolhida

---

## 🎉 Pronto!

Após o deploy, seu sistema estará acessível via navegador de qualquer lugar, sem precisar manter seu PC ligado!

**URL de exemplo**: `https://controle-jurados.onrender.com`

