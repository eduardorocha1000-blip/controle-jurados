# Script PowerShell para executar o schema D1 via Wrangler CLI
# Execute: .\cloudflare-pages\executar-schema.ps1

Write-Host "Executando schema do banco D1..." -ForegroundColor Green

# Verificar se Wrangler está instalado
$wranglerInstalled = Get-Command wrangler -ErrorAction SilentlyContinue

if (-not $wranglerInstalled) {
    Write-Host "Wrangler CLI nao encontrado!" -ForegroundColor Red
    Write-Host "Instalando Wrangler..." -ForegroundColor Yellow
    npm install -g wrangler
}

# Nome do banco (ajuste se necessário)
$dbName = "controle-jurados-db"

Write-Host "Executando schema no banco: $dbName" -ForegroundColor Cyan

# Executar o schema (usando --remote para acessar o banco remoto)
Write-Host "IMPORTANTE: Use --remote para acessar o banco remoto" -ForegroundColor Yellow
Write-Host "Ou execute manualmente no Console do D1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para executar via Wrangler, use:" -ForegroundColor Cyan
Write-Host "wrangler d1 execute $dbName --remote --file=./cloudflare-pages/schema-d1.sql" -ForegroundColor White
Write-Host ""
Write-Host "OU execute manualmente no Console do D1:" -ForegroundColor Cyan
Write-Host "1. Acesse: https://dash.cloudflare.com/" -ForegroundColor White
Write-Host "2. Vá em Workers & Pages > D1 > Seu Banco" -ForegroundColor White
Write-Host "3. Clique em Console" -ForegroundColor White
Write-Host "4. Execute cada comando do arquivo schema-comandos-individuais.sql" -ForegroundColor White
Write-Host ""
Write-Host "Verificando se o banco existe..." -ForegroundColor Cyan

# Verificar se o banco existe
try {
    wrangler d1 list
    Write-Host ""
    Write-Host "Se o banco nao aparecer na lista, crie-o no Dashboard primeiro" -ForegroundColor Yellow
} catch {
    Write-Host "Erro ao listar bancos. Verifique se esta logado: wrangler login" -ForegroundColor Red
}

Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Crie um usuario no banco para testar o login" -ForegroundColor White
Write-Host "2. Configure o binding DB no Cloudflare Pages" -ForegroundColor White
Write-Host "3. Faca o deploy novamente" -ForegroundColor White

