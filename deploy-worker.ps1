# SafeSight LINE Webhook Worker — One-Shot Deploy Script
# Run from: c:\Users\August\.antigravity-ide\safesight\SafeSight\
# Usage: .\deploy-worker.ps1

Write-Host '🛡️ SafeSight LINE Webhook v2.2.0 — Deploy' -ForegroundColor Cyan

# Check auth
$whoami = npx wrangler whoami 2>&1
if ($whoami -match 'not authenticated') {
    Write-Host '🔐 Session expired. Logging in...' -ForegroundColor Yellow
    npx wrangler login
    Write-Host 'After approving the browser, re-run: .\deploy-worker.ps1' -ForegroundColor Gray
    exit 0
}

Write-Host '✅ Deploying...' -ForegroundColor Green
npx wrangler deploy line-webhook-worker.js --name safesight --compatibility-date 2024-01-01 --env=''

if ($LASTEXITCODE -eq 0) {
    Write-Host '🎉 Live: https://safesight.safesightarise.workers.dev/' -ForegroundColor Green
}
