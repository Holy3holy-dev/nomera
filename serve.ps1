$port = 5500
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Сервер запущен: http://localhost:$port/"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            $urlPath = $request.Url.LocalPath
            if ($urlPath -eq "/" -or $urlPath -eq "") {
                $urlPath = "/index.html"
            }

            $filePath = Join-Path $root ($urlPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar))

            $filePath = [System.IO.Path]::GetFullPath($filePath)
            if (-not $filePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
                $response.StatusCode = 403
                continue
            }

            if (Test-Path $filePath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = "text/plain; charset=utf-8"
                switch ($ext) {
                    ".html" { $contentType = "text/html; charset=utf-8" }
                    ".js"   { $contentType = "application/javascript; charset=utf-8" }
                    ".json" { $contentType = "application/json; charset=utf-8" }
                    ".css"  { $contentType = "text/css; charset=utf-8" }
                    ".png"  { $contentType = "image/png" }
                    ".svg"  { $contentType = "image/svg+xml" }
                    ".jpg"  { $contentType = "image/jpeg" }
                    ".ico"  { $contentType = "image/x-icon" }
                    ".glb"  { $contentType = "model/gltf-binary" }
                    ".gltf" { $contentType = "model/gltf+json" }
                    ".bin"  { $contentType = "application/octet-stream" }
                }
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length

                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            } else {
                $response.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.ContentLength64 = $errBytes.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                }
            }
        } catch {
            Write-Host "Request error: $_"
        } finally {
            $response.Close()
        }
    }
} finally {
    $listener.Stop()
}
