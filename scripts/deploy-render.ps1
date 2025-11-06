# Script de Deploy para Render.com
# Execute: powershell -ExecutionPolicy Bypass -File .\scripts\deploy-render.ps1

param(
    [string]$GitHubRepo = "",
    [string]$GitUser = "",
    [string]$GitEmail = "",
    [switch]$Help
)

# Ajustar encoding para evitar problemas com acentos
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[SUCCESS] $msg" -ForegroundColor Green }
function Write-Err($msg) { Write-Host "[ERRO] $msg" -ForegroundColor Red }
function Write-Warn($msg) { Write-Host "[AVISO] $msg" -ForegroundColor Yellow }

if ($Help) {
    Write-Info @"
Script de Deploy para Render.com

Uso:
  .\scripts\deploy-render.ps1 -GitHubRepo "usuario/repo" [-GitUser "Seu Nome"] [-GitEmail "seu@email.com"]

Exemplo:
  .\scripts\deploy-render.ps1 -GitHubRepo "meuusuario/controle-jurados" -GitUser "Meu Nome" -GitEmail "meu@email.com"

Este script:
1. Configura o Git (nome e email)
2. Verifica se o Git esta configurado
3. Prepara o codigo para commit
4. Faz push para GitHub
5. Fornece instrucoes para configurar no Render.com

"@
    exit 0
}

Write-Info "=== Script de Deploy para Render.com ==="
Write-Info ""

# Verificar se esta no diretorio correto
if (-not (Test-Path "package.json")) {
    Write-Err "Execute este script no diretorio raiz do projeto!"
    exit 1
}

# Verificar Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Err "Git nao encontrado. Instale o Git primeiro: https://git-scm.com/download/win"
    exit 1
}

# Configurar Git (se necessario)
$currentUser = git config --global user.name 2>$null
$currentEmail = git config --global user.email 2>$null

if (-not $currentUser -or -not $currentEmail) {
    if ($GitUser -and $GitEmail) {
        Write-Info "Configurando Git com nome e email fornecidos..."
        git config --global user.name $GitUser
        git config --global user.email $GitEmail
        Write-Success "Git configurado!"
    } else {
        Write-Warn "Git nao esta configurado (nome e email)."
        Write-Info "Configure manualmente:"
        Write-Info "  git config --global user.name 'Seu Nome'"
        Write-Info "  git config --global user.email 'seu@email.com'"
        Write-Info ""
        Write-Info "Ou use o script com: -GitUser 'Seu Nome' -GitEmail 'seu@email.com'"
        Write-Info ""
        $continue = Read-Host "Deseja continuar mesmo assim? (S/N)"
        if ($continue -ne "S" -and $continue -ne "s") {
            exit 1
        }
    }
}

# Verificar se e repositorio Git
if (-not (Test-Path ".git")) {
    Write-Info "Inicializando repositorio Git..."
    git init
    git branch -M main
}

# Adicionar arquivos
Write-Info "Adicionando arquivos ao Git..."
git add . 2>&1 | Out-Null

# Verificar se ha mudancas ou se nao ha commits
$status = git status --porcelain
$hasCommits = git log --oneline -1 2>$null

if (-not $status -and $hasCommits) {
    Write-Warn "Nenhuma mudanca para commitar. Usando commits existentes."
} else {
    if ($status) {
        Write-Info "Fazendo commit das mudancas..."
        $commitMsg = "Preparar para deploy no Render.com"
        git commit -m $commitMsg 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Commit realizado!"
        } else {
            Write-Err "Erro ao fazer commit. Verifique se o Git esta configurado corretamente."
            exit 1
        }
    } else {
        Write-Info "Criando commit inicial..."
        $commitMsg = "Commit inicial - Preparar para deploy no Render.com"
        git commit -m $commitMsg --allow-empty 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Commit inicial criado!"
        }
    }
}

# Verificar se ha commits
$hasCommits = git log --oneline -1 2>$null
if (-not $hasCommits) {
    Write-Err "Nao ha commits no repositorio. Criando commit inicial..."
    git commit -m "Commit inicial" --allow-empty 2>&1 | Out-Null
}

# Verificar remote
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    if ($GitHubRepo) {
        Write-Info "Configurando remote do GitHub: $GitHubRepo"
        git remote add origin "https://github.com/$GitHubRepo.git"
        $remote = git remote get-url origin
    } else {
        Write-Err "Repositorio GitHub nao configurado!"
        Write-Info "Execute: git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git"
        Write-Info "Ou use: .\scripts\deploy-render.ps1 -GitHubRepo 'usuario/repo'"
        exit 1
    }
} else {
    Write-Info "Remote ja configurado: $remote"
    if ($GitHubRepo) {
        $expectedRemote = "https://github.com/$GitHubRepo.git"
        if ($remote -ne $expectedRemote) {
            Write-Warn "Remote atual ($remote) e diferente do esperado ($expectedRemote)"
            $update = Read-Host "Deseja atualizar o remote? (S/N)"
            if ($update -eq "S" -or $update -eq "s") {
                git remote set-url origin $expectedRemote
                Write-Success "Remote atualizado!"
            }
        }
    }
}

# Fazer push
Write-Info "Fazendo push para GitHub..."
Write-Info "Nota: Se solicitado, faca login no GitHub ou use um Personal Access Token"
Write-Info ""

$pushOutput = git push -u origin main 2>&1
$pushSuccess = $LASTEXITCODE -eq 0

if ($pushSuccess) {
    Write-Success "Push realizado com sucesso!"
} else {
    Write-Err "Erro ao fazer push para GitHub."
    Write-Info ""
    Write-Info "Possiveis causas:"
    Write-Info "1. Credenciais do GitHub nao configuradas"
    Write-Info "2. Repositorio nao existe no GitHub"
    Write-Info "3. Sem permissao para fazer push"
    Write-Info ""
    Write-Info "Solucoes:"
    Write-Info "1. Crie o repositorio no GitHub primeiro: https://github.com/new"
    Write-Info "2. Configure autenticacao: https://docs.github.com/en/authentication"
    Write-Info "3. Ou use GitHub Desktop: https://desktop.github.com"
    Write-Info ""
    Write-Info "Tentando novamente com force push (se necessario)..."
    Write-Warn "Se o erro persistir, faca o push manualmente ou use GitHub Desktop"
    exit 1
}

Write-Info ""
Write-Success "=== Codigo enviado para GitHub! ==="
Write-Info ""
Write-Info "Proximos passos:"
Write-Info "1. Acesse: https://render.com"
Write-Info "2. Faca login com GitHub"
Write-Info "3. Clique em 'New +' -> 'Web Service'"
if ($GitHubRepo) {
    Write-Info "4. Selecione seu repositorio: $GitHubRepo"
} else {
    Write-Info "4. Selecione seu repositorio do GitHub"
}
Write-Info "5. Configure:"
Write-Info "   - Build Command: npm install"
Write-Info "   - Start Command: npm start"
Write-Info "   - Plan: Free"
Write-Info "6. Adicione as variaveis de ambiente (veja DEPLOY.md)"
Write-Info "7. Crie um disco persistente para o banco de dados"
Write-Info ""
Write-Info "Para mais detalhes, consulte: DEPLOY.md"

