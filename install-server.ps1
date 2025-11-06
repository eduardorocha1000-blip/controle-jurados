Segue um guia enxuto + script de instalação para Windows Server com Docker.

### Pré-requisitos
- Windows Server 2019/2022 com:
  - Docker Desktop (ou Docker Engine) instalado e funcionando
  - Docker Compose v2 (docker compose) habilitado
- Porta 3000 liberada no firewall interno
- Pasta do projeto copiada para o servidor (ex.: C:\apps\Controle-jurados)

### Estrutura esperada no servidor
- C:\apps\Controle-jurados\
  - Dockerfile
  - docker-compose.yml
  - env.example
  - (todo o restante do projeto)

### Passo a passo (uma vez)
1) Copie o projeto para o servidor em C:\apps\Controle-jurados
2) Abra PowerShell como Administrador
3) Execute o script abaixo (salve como C:\apps\Controle-jurados\install-server.ps1 e rode com: powershell -ExecutionPolicy Bypass -File .\install-server.ps1)

```powershell
# install-server.ps1
# Instalação/Inicialização do Controle-jurados em Windows Server com Docker

param(
  [string]$AppDir = "C:\apps\Controle-jurados",
  [int]$Porta = 3000
)

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Err($msg)  { Write-Host "[ERRO] $msg" -ForegroundColor Red }

# 1) Checagem de Admin
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
  Write-Err "Execute este script como Administrador."
  exit 1
}

# 2) Validar Docker
try {
  docker version | Out-Null
} catch {
  Write-Err "Docker não encontrado. Instale o Docker Desktop/Engine e tente novamente."
  exit 1
}

# 3) Subir Docker Service (se necessário)
Write-Info "Garantindo que o serviço do Docker esteja ativo..."
try {
  Start-Service com.docker.service -ErrorAction SilentlyContinue
} catch { }

# 4) Ajustar diretório da aplicação
if (-not (Test-Path $AppDir)) {
  Write-Err "Diretório da aplicação não encontrado: $AppDir"
  exit 1
}
Set-Location $AppDir

# 5) Criar .env a partir de env.example (se não existir)
$envFile = Join-Path $AppDir ".env"
$envExample = Join-Path $AppDir "env.example"
if (-not (Test-Path $envFile)) {
  if (Test-Path $envExample) {
    Copy-Item $envExample $envFile -Force
    Write-Info "Arquivo .env criado a partir de env.example."
  } else {
    New-Item -ItemType File -Path $envFile | Out-Null
    Write-Info "Arquivo .env criado (vazio)."
  }
}

# 6) Criar pastas de dados (uploads/db) se o compose usar bind mounts
$uploads = Join-Path $AppDir "uploads"
if (-not (Test-Path $uploads)) { New-Item -ItemType Directory -Path $uploads | Out-Null }

# 7) Abrir porta no Firewall
Write-Info "Liberando porta $Porta no Firewall (TCP)..."
try {
  New-NetFirewallRule -DisplayName "ControleJurados-$Porta" -Direction Inbound -Protocol TCP -LocalPort $Porta -Action Allow -ErrorAction SilentlyContinue | Out-Null
} catch { }

# 8) Subir containers
function ComposeUp {
  try {
    docker compose version | Out-Null
    docker compose pull
    docker compose up -d
    return $true
  } catch {
    return $false
  }
}

if (-not (ComposeUp)) {
  Write-Info "docker compose falhou; tentando docker-compose..."
  try {
    docker-compose --version | Out-Null
    docker-compose pull
    docker-compose up -d
  } catch {
    Write-Err "Falha ao executar docker compose/docker-compose. Verifique se o Docker Compose está instalado."
    exit 1
  }
}

Write-Info "Aplicação publicada em http://$(hostname):$Porta"
Write-Info "Se desejar acessar por IP: http://$( (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.*'} | Select-Object -First 1 -ExpandProperty IPAddress) ):$Porta"

# 9) Criar tarefa agendada para subir no boot (opcional)
$taskName = "ControleJurados-Startup"
if (-not (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue)) {
  Write-Info "Criando tarefa agendada de inicialização (subir containers no boot)..."
  $composeCmd = if (Get-Command "docker" -ErrorAction SilentlyContinue) {
    "docker compose -f `"$($AppDir)\docker-compose.yml`" up -d"
  } else {
    "docker-compose -f `"$($AppDir)\docker-compose.yml`" up -d"
  }
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -Command `"Set-Location '$AppDir'; $composeCmd`""
  $trigger = New-ScheduledTaskTrigger -AtStartup
  $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal | Out-Null
  Write-Info "Tarefa agendada criada: $taskName"
}

Write-Info "Instalação concluída."
```

### Uso diário
- Iniciar/Parar:
  - Iniciar: na pasta do projeto, execute docker compose up -d
  - Parar: docker compose down
- Acessar: http://SERVIDOR:3000

### Backup/Restore
- Use a página “Backup” do próprio sistema (gera ZIP).
- Opcional: copie periodicamente C:\apps\Controle-jurados\uploads e o arquivo do banco (se houver bind mount no compose) para um compartilhamento seguro.

Quer que eu valide seu docker-compose.yml para garantir persistência de database/uploads com volumes/binds? Posso ajustar conforme sua preferência.