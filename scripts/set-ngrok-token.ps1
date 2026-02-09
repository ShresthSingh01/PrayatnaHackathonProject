Write-Host "Setting up ngrok authentication..." -ForegroundColor Cyan
$token = Read-Host "Please enter your ngrok auth token (from https://dashboard.ngrok.com/get-started/your-authtoken)"

if (-not [string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Configuring ngrok with provided token..."
    npx ngrok config add-authtoken $token
    if ($?) {
        Write-Host "Auth token set successfully!" -ForegroundColor Green
        Write-Host "You can now run '.\scripts\start-ngrok.ps1' to start the tunnel." -ForegroundColor Cyan
    }
    else {
        Write-Host "Failed to set auth token. Please check the error message above." -ForegroundColor Red
    }
}
else {
    Write-Host "No token provided. Operation cancelled." -ForegroundColor Yellow
}
