Write-Host "========================================" -ForegroundColor Green
Write-Host "InventorySmart - Systema ucheta oborudovaniya" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Zapusk backend servera..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\User_161\Documents\Projects\inventorysmart"
    node server/index.js
}

Start-Sleep -Seconds 2

Write-Host "Backend zapushchen na http://localhost:3001" -ForegroundColor Green
Write-Host ""

Write-Host "Zapusk frontend (Vite)..." -ForegroundColor Yellow
Set-Location "C:\Users\User_161\Documents\Projects\inventorysmart\client"
npm run dev

Write-Host ""
Write-Host "Frontend zapushchen na http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Dlya ostanovki nажмите Ctrl+C" -ForegroundColor Yellow
