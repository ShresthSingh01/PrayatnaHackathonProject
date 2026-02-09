# Use npx to run ngrok from local node_modules
Write-Host "Starting ngrok tunnel for port 5174 via npx..." -ForegroundColor Green
Write-Host "Please copy the 'Forwarding' URL from the ngrok output below to access the app on other devices." -ForegroundColor Yellow
npx ngrok http 5174
