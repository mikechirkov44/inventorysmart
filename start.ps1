Write-Host "========================================" -ForegroundColor Green
Write-Host "InventorySmart - Система учета оборудования" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Запуск backend сервера..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\User_161\Documents\Projects\inventorysmart"
    node server/index.js
}

Start-Sleep -Seconds 3

Write-Host "Backend запущен на http://localhost:3001" -ForegroundColor Green
Write-Host ""

Write-Host "Запуск frontend (основное приложение)..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\User_161\Documents\Projects\inventorysmart\client"
    npx vite --host
}

Start-Sleep -Seconds 2

Write-Host "Запуск frontend (панель суперадмина)..." -ForegroundColor Yellow
$adminJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\User_161\Documents\Projects\inventorysmart\client-admin"
    npx vite --host
}

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Все сервисы запущены:" -ForegroundColor Green
Write-Host "  Основное приложение: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Панель суперадмина:  http://localhost:5174" -ForegroundColor Cyan
Write-Host "  API сервер:          http://localhost:3001" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Для остановки нажмите Ctrl+C" -ForegroundColor Yellow

try {
    while ($true) {
        Start-Sleep -Seconds 5
        $backendRunning = Get-Job -Id $backendJob.Id -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Running' }
        $frontendRunning = Get-Job -Id $frontendJob.Id -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Running' }
        $adminRunning = Get-Job -Id $adminJob.Id -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Running' }

        if (-not $backendRunning -and -not $frontendRunning -and -not $adminRunning) {
            Write-Host "Все сервисы остановлены." -ForegroundColor Red
            break
        }
    }
} finally {
    Write-Host "Остановка сервисов..." -ForegroundColor Yellow
    Stop-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
    Stop-Job -Id $frontendJob.Id -ErrorAction SilentlyContinue
    Stop-Job -Id $adminJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $frontendJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $adminJob.Id -ErrorAction SilentlyContinue
    Write-Host "Готово." -ForegroundColor Green
}
