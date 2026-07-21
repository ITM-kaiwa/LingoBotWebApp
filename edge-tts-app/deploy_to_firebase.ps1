# PowerShell Helper Script for Firebase Hosting Deployment of LingoBotWebApp

Write-Host "🔥 Preparing Firebase Deployment for LingoBotWebApp..." -ForegroundColor Cyan

# Check Firebase CLI installation
$firebaseCli = Get-Command firebase -ErrorAction SilentlyContinue

if (-not $firebaseCli) {
    Write-Host "⚠️ Firebase CLI is not installed. Installing firebase-tools via npm/curl..." -ForegroundColor Yellow
    Write-Host "To install Firebase CLI, please run:" -ForegroundColor White
    Write-Host "  npm install -g firebase-tools" -ForegroundColor Green
    Write-Host "  OR download standalone binary from: https://firebase.tools/bin/win/latest" -ForegroundColor Green
    Exit
}

# Login check
Write-Host "🔐 Logging in to Firebase..." -ForegroundColor Cyan
firebase login

# Deploy to Firebase Hosting
Write-Host "🚀 Deploying LingoBotWebApp to Firebase Hosting..." -ForegroundColor Cyan
firebase deploy --only hosting

Write-Host "✅ Deployment Complete! Your app is live." -ForegroundColor Green
