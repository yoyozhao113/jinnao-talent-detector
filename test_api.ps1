$body = @{
    name = "贝贝"
    birthDate = "2013-07-05"
    birthHour = 6
    birthMinute = 13
    latitude = 30.27
    longitude = 120.15
    version = "free"
} | ConvertTo-Json -Compress

$resp = Invoke-WebRequest -Uri "http://localhost:3001/api/chart" -Method POST -ContentType "application/json" -Body $body
$j = $resp.Content | ConvertFrom-Json

Write-Host "=== 行星 ==="
$j.data.planets.PSObject.Properties | Where-Object { $_.Name -ne 'rising' -and $_.Name -ne 'mc' } | ForEach-Object {
    Write-Host "$($_.Name): $($j.data.planets.$($_.Name).display)"
}
Write-Host "上升: $($j.data.planets.rising.display)"
Write-Host "中天: $($j.data.planets.mc.display)"

Write-Host "`n=== 宫位 ==="
$j.data.houses | ForEach-Object {
    Write-Host "$($_.house)宫: $($_.display)"
}
