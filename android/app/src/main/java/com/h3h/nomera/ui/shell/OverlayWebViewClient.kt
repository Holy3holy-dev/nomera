package com.h3h.nomera.ui.shell

import android.content.Intent
import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import com.h3h.nomera.domain.repository.AssetOverlayRepository
import java.io.ByteArrayInputStream

internal class OverlayWebViewClient(
    private val repository: AssetOverlayRepository
) : WebViewClient() {

    override fun shouldOverrideUrlLoading(
        view: WebView?,
        request: WebResourceRequest?
    ): Boolean {
        val url = request?.url ?: return false
        if (url.host != VIRTUAL_ASSET_HOST && (url.path?.endsWith(".apk", ignoreCase = true) == true || url.host?.contains("github.com", ignoreCase = true) == true)) {
            try {
                val intent = Intent(Intent.ACTION_VIEW, url).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                view?.context?.startActivity(intent)
                return true
            } catch (_: Exception) {}
        }
        return super.shouldOverrideUrlLoading(view, request)
    }

    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest?
    ): WebResourceResponse? {
        val url = request?.url ?: return null
        if (url.host != VIRTUAL_ASSET_HOST) {
            return super.shouldInterceptRequest(view, request)
        }

        val corsHeaders = mapOf(
            "Access-Control-Allow-Origin" to "*",
            "Access-Control-Allow-Methods" to "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers" to "*",
            "Cache-Control" to "no-cache"
        )

        if (request.method.equals("OPTIONS", ignoreCase = true)) {
            return WebResourceResponse(
                "text/plain",
                "UTF-8",
                200,
                "OK",
                corsHeaders,
                ByteArrayInputStream(ByteArray(0))
            )
        }

        val rawPath = url.path?.trimStart('/') ?: "index.html"
        val targetPath = if (rawPath.isEmpty()) "index.html" else rawPath
        val stream = repository.openAssetStream(targetPath) ?: return WebResourceResponse(
            "text/plain",
            "UTF-8",
            404,
            "Not Found",
            corsHeaders,
            ByteArrayInputStream(ByteArray(0))
        )

        val mimeType = repository.guessMimeType(targetPath)
        val encoding = if (mimeType.startsWith("text/") || mimeType == "application/json") "UTF-8" else null
        return WebResourceResponse(mimeType, encoding, 200, "OK", corsHeaders, stream)
    }

    companion object {
        const val VIRTUAL_ASSET_HOST = "appassets.androidplatform.net"
        val ENTRY_URI: Uri = Uri.parse("https://$VIRTUAL_ASSET_HOST/index.html")
    }
}
