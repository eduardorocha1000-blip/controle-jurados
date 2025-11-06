# 🚀 Início Rápido - Deploy em Nuvem

## Opção Mais Rápida: Render.com (Gratuito)

### 1️⃣ Preparar o Código

```powershell
# No PowerShell, no diretório do projeto
cd C:\Users\cliente\Desktop\Controle-jurados-Server\Controle-jurados

# Gerar SESSION_SECRET
.\scripts\gerar-session-secret.ps1

# Preparar para GitHub (se ainda não tiver)
git init
git add .
git commit -m "Preparar para deploy"
```

### 2️⃣ Criar Repositório no GitHub

1. Acesse: https://github.com/new
2. Crie um repositório (ex: `controle-jurados`)
3. **NÃO** inicialize com README
4. Copie a URL do repositório

### 3️⃣ Enviar para GitHub

```powershell
# Conectar ao GitHub
git remote add origin https://github.com/SEU_USUARIO/controle-jurados.git
git branch -M main
git push -u origin main
```

**OU** use o script automatizado:

```powershell
.\scripts\deploy-render.ps1 -GitHubRepo "SEU_USUARIO/controle-jurados"
```

### 4️⃣ Deploy no Render.com

1. Acesse: https://render.com
2. Faça login com GitHub
3. Clique em **"New +"** → **"Web Service"**
4. Selecione seu repositório
5. Configure:
   - **Name**: `controle-jurados`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
6. Clique em **"Create Web Service"**

### 5️⃣ Configurar Variáveis de Ambiente

No Render, vá em **"Environment"** e adicione:

```
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
DB_FILENAME=/opt/render/project/src/database/controle_jurados.db
SESSION_SECRET=<cole o valor gerado no passo 1>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app_gmail
SMTP_FROM=Vara Única <vara@tjsc.jus.br>
APP_URL=https://controle-jurados.onrender.com
```

**⚠️ IMPORTANTE**: 
- Use **Senha de App do Gmail** (não sua senha normal)
- Gere em: https://myaccount.google.com/apppasswords
- `APP_URL` será preenchido após o deploy (copie a URL do Render)

### 6️⃣ Criar Disco Persistente

1. No Render, vá em **"Disks"**
2. Clique em **"Create Disk"**
3. Configure:
   - **Name**: `controle-jurados-data`
   - **Mount Path**: `/opt/render/project/src/database`
   - **Size**: `1 GB`
4. Conecte ao seu Web Service

### 7️⃣ Executar Migrações

1. Após o deploy, vá em **"Shell"** no menu do serviço
2. Execute:
```bash
npm run migrate
```

### 8️⃣ Pronto! 🎉

Acesse a URL fornecida pelo Render (ex: `https://controle-jurados.onrender.com`)

---

## 📚 Documentação Completa

Para mais detalhes e outras opções (Railway, Fly.io), consulte: **DEPLOY.md**

---

## ⚠️ Observações Importantes

### Render.com (Plano Gratuito)
- ✅ Gratuito
- ✅ SSL automático (HTTPS)
- ⚠️ Pode "dormir" após 15 minutos de inatividade
- ⚠️ Primeira requisição após dormir pode demorar ~30 segundos

### Alternativas (se precisar de mais performance)
- **Railway.app**: $5 créditos gratuitos/mês, não dorme
- **Fly.io**: Plano gratuito generoso, alta performance

---

## 🆘 Problemas?

1. Verifique os logs no Render
2. Verifique as variáveis de ambiente
3. Consulte **DEPLOY.md** para troubleshooting
4. Certifique-se de que as migrações foram executadas

