# Script para gerar SESSION_SECRET
# Execute: powershell -ExecutionPolicy Bypass -File .\scripts\gerar-session-secret.ps1

# Ajustar codificacao de saida para evitar problemas de acentuacao
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

Write-Host "Gerando SESSION_SECRET..." -ForegroundColor Cyan
Write-Host ""

$secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

Write-Host "SESSION_SECRET gerado:" -ForegroundColor Green
Write-Host $secret -ForegroundColor Yellow
Write-Host ""
Write-Host "Use este valor na variavel de ambiente SESSION_SECRET" -ForegroundColor Cyan
Write-Host "Exemplo: SESSION_SECRET=$secret" -ForegroundColor Gray

# Copiar para clipboard (Windows)
try {
  $secret | Set-Clipboard
  Write-Host "Valor copiado para a area de transferencia!" -ForegroundColor Green
} catch {
  Write-Host "Nao foi possivel copiar para a area de transferencia. Copie manualmente." -ForegroundColor Yellow
}

