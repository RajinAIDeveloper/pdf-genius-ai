# test-debug.ps1

# First, test if the server is running
try {
    $serverCheck = Invoke-WebRequest -Uri 'http://localhost:3000' -Method Get
    Write-Host "Server Status: $($serverCheck.StatusCode)"
} catch {
    Write-Host "Server Error: $($_.Exception.Message)"
    Write-Host "Make sure your Next.js server is running (npm run dev)"
    exit
}

# Test the API endpoint with verbose output
$headers = @{
    'Content-Type' = 'application/json'
}

$body = @{
    model = 'google/gemini-2.0-embeddings:free'
    input = 'This is a test text for generating embeddings'
} | ConvertTo-Json

Write-Host "`nTesting API endpoint..."
Write-Host "URL: http://localhost:3000/api/embeddings"
Write-Host "Headers: $($headers | ConvertTo-Json)"
Write-Host "Body: $body"

try {
    $response = Invoke-WebRequest `
        -Uri 'http://localhost:3000/api/embeddings' `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -Verbose

    Write-Host "`nSuccess!"
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Response Headers:"
    $response.Headers | Format-Table -AutoSize
    Write-Host "Response Body:"
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "`nError occurred:"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Status Description: $($_.Exception.Response.StatusDescription)"
    Write-Host "Error Message: $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)"
    }
}