# 🚀 Guia Rápido - Git e GitHub

## ✅ Git Inicializado

O repositório Git foi inicializado com sucesso! Agora você precisa:

## 📝 Passo 1: Fazer o Primeiro Commit

Execute no PowerShell na raiz do projeto:

```powershell
cd "C:\Users\cliente\Desktop\Controle-jurados-Server\Controle-jurados"
git commit -m "Sistema de controle de jurados - migração para Cloudflare Pages"
```

## 🔗 Passo 2: Criar Repositório no GitHub

1. Acesse https://github.com/new
2. Crie um novo repositório:
   - **Nome**: `controle-jurados` (ou outro nome)
   - **Descrição**: Sistema de Controle de Jurados - Cloudflare Pages
   - **Visibilidade**: Público ou Privado (sua escolha)
   - **NÃO** marque "Initialize with README"
   - **NÃO** adicione .gitignore ou license
3. Clique em **Create repository**

## 🔌 Passo 3: Conectar ao Repositório Remoto

Após criar o repositório no GitHub, você verá instruções. Execute:

```powershell
# Substitua SEU-USUARIO pelo seu nome de usuário do GitHub
git remote add origin https://github.com/SEU-USUARIO/controle-jurados.git
git branch -M main
git push -u origin main
```

**OU** se você já tem um repositório existente:

```powershell
git remote add origin https://github.com/SEU-USUARIO/controle-jurados.git
git branch -M main
git push -u origin main
```

## 🔐 Passo 4: Autenticação

Se for solicitado login:
- **Username**: Seu nome de usuário do GitHub
- **Password**: Use um **Personal Access Token** (não sua senha)
  - Como criar: https://github.com/settings/tokens
  - Permissões: `repo` (acesso completo aos repositórios)

## ✅ Verificação

Após o push, verifique:
1. Acesse seu repositório no GitHub
2. Verifique se todos os arquivos foram enviados
3. Verifique se o diretório `dist/` está presente
4. Verifique se o diretório `functions/` está presente

## 🚀 Próximo Passo: Cloudflare Pages

Após fazer o push:
1. Acesse o Cloudflare Dashboard
2. Vá em **Workers & Pages > Pages**
3. Clique em **Create a project > Connect to Git**
4. Conecte seu repositório GitHub
5. Configure:
   - **Build output directory**: `dist`
   - **Build command**: (deixe vazio)
6. Configure o D1 Database binding (`DB`)
7. Faça o deploy!

## 🆘 Problemas Comuns

### Erro: "remote origin already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/SEU-USUARIO/controle-jurados.git
```

### Erro: "authentication failed"
- Use Personal Access Token em vez da senha
- Verifique se o token tem permissão `repo`

### Erro: "branch main does not exist"
```powershell
git branch -M main
git push -u origin main
```

## 📚 Comandos Úteis

```powershell
# Ver status
git status

# Ver commits
git log --oneline

# Adicionar arquivos modificados
git add .

# Fazer commit
git commit -m "Mensagem do commit"

# Fazer push
git push

# Ver remotes configurados
git remote -v
```

