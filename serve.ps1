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

            # Netlify Functions Mock for Local Testing
            if ($urlPath -eq "/.netlify/functions/firebase-web-config") {
                $body = 'window.NOMERA_FIREBASE_CONFIG_ERROR = "Локальный тестовый режим (гость/офлайн)";'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
                $response.ContentType = "application/javascript; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.Headers.Add("Cache-Control", "no-cache")
                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
                continue
            }

            if ($urlPath -eq "/.netlify/functions/online") {
                $body = '{"ok":false,"error":"Локальный режим: баланс и машины сохраняются в гостевом профиле"}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.Headers.Add("Cache-Control", "no-cache")
                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
                continue
            }

            $filePath = Join-Path $root ($urlPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar))

            $filePath = [System.IO.Path]::GetFullPath($filePath)
            if (-not $filePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
                $response.StatusCode = 403
                continue
            }

            if (Test-Path $filePath -PathType Leaf) {
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
                    ".jpeg" { $contentType = "image/jpeg" }
                    ".ico"  { $contentType = "image/x-icon" }
                    ".glb"  { $contentType = "model/gltf-binary" }
                    ".gltf" { $contentType = "model/gltf+json" }
                    ".bin"  { $contentType = "application/octet-stream" }
                    ".wasm" { $contentType = "application/wasm" }
                    ".mp3"  { $contentType = "audio/mpeg" }
                    ".wav"  { $contentType = "audio/wav" }
                }
                $response.ContentType = $contentType
                $response.Headers.Add("Access-Control-Allow-Origin", "*")

                $isStaticAsset = $ext -in @(".glb", ".gltf", ".bin", ".wasm", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".mp3", ".wav")
                if ($isStaticAsset) {
                    $response.Headers.Add("Cache-Control", "public, max-age=604800, immutable")
                } else {
                    $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                }

                $fileStream = [System.IO.File]::OpenRead($filePath)
                try {
                    $response.ContentLength64 = $fileStream.Length
                    if ($request.HttpMethod -ne "HEAD") {
                        $buffer = New-Object byte[] 65536
                        while (($bytesRead = $fileStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
                            $response.OutputStream.Write($buffer, 0, $bytesRead)
                        }
                    }
                } finally {
                    $fileStream.Dispose()
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
