package com.h3h.nomera.ui.shell

import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import com.h3h.nomera.domain.repository.AssetOverlayRepository

internal class OverlayWebViewClient(
    private val repository: AssetOverlayRepository
) : WebViewClient() {

    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest?
    ): WebResourceResponse? {
        val url = request?.url ?: return null
        if (url.host != VIRTUAL_ASSET_HOST) {
            return super.shouldInterceptRequest(view, request)
        }

        val rawPath = url.path?.trimStart('/') ?: "index.html"
        val targetPath = if (rawPath.isEmpty()) "index.html" else rawPath
        val stream = repository.openAssetStream(targetPath) ?: return WebResourceResponse(
            "text/plain",
            "UTF-8",
            404,
            "Not Found",
            mapOf("Access-Control-Allow-Origin" to "*"),
            null
        )

        val mimeType = repository.guessMimeType(targetPath)
        val encoding = if (mimeType.startsWith("text/") || mimeType == "application/json") "UTF-8" else null
        val headers = mapOf(
            "Access-Control-Allow-Origin" to "*",
            "Access-Control-Allow-Methods" to "GET, HEAD, OPTIONS",
            "Cache-Control" to "no-cache"
        )
        return WebResourceResponse(mimeType, encoding, 200, "OK", headers, stream)
    }

    companion object {
        const val VIRTUAL_ASSET_HOST = "appassets.androidplatform.net"
        val ENTRY_URI: Uri = Uri.parse("https://$VIRTUAL_ASSET_HOST/index.html")
    }
}
