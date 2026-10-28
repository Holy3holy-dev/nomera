package com.h3h.nomera.ui.shell

import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.h3h.nomera.BuildConfig
import com.h3h.nomera.domain.repository.AssetOverlayRepository
import com.h3h.nomera.domain.usecase.SyncGameAssetsUseCase
import org.json.JSONObject
import java.util.concurrent.Executors

internal class NomeraJsBridge(
    private val webView: WebView,
    private val repository: AssetOverlayRepository,
    private val syncGameAssetsUseCase: SyncGameAssetsUseCase
) {
    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    @Volatile
    private var syncInFlight = false

    @JavascriptInterface
    fun getClientInfo(): String {
        val manifest = repository.readEffectiveManifest()
        val overlayCount = repository.readOverlayVersions().size
        return JSONObject().apply {
            put("platform", "android-apk")
            put("versionName", BuildConfig.VERSION_NAME)
            put("release", manifest.release)
            put("bundledFiles", manifest.files.size)
            put("overlayFiles", overlayCount)
        }.toString()
    }

    @JavascriptInterface
    fun openExternalUrl(url: String?) {
        if (url.isNullOrBlank()) return
        mainHandler.post {
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                webView.context.startActivity(intent)
            } catch (_: Exception) {}
        }
    }

    @JavascriptInterface
    fun triggerOtaSync(customBaseUrl: String?) {
        if (syncInFlight) return
        syncInFlight = true
        val targetUrl = if (!customBaseUrl.isNullOrBlank()) customBaseUrl else BuildConfig.DEFAULT_OTA_BASE_URL

        executor.execute {
            try {
                val result = syncGameAssetsUseCase(targetUrl) { current, total, path ->
                    dispatchToPage(
                        JSONObject().apply {
                            put("phase", "downloading")
                            put("current", current)
                            put("total", total)
                            put("path", path)
                        }
                    )
                }
                dispatchToPage(
                    JSONObject().apply {
                        put("phase", "complete")
                        put("updated", result.updated)
                        put("release", result.release ?: "")
                        put("downloadedCount", result.downloadedCount)
                        put("deletedCount", result.deletedCount)
                        put("downloadBytes", result.downloadBytes)
                        if (result.error != null) put("error", result.error)
                    }
                )
            } finally {
                syncInFlight = false
            }
        }
    }

    private fun dispatchToPage(payload: JSONObject) {
        val js = "window.onNomeraAndroidOtaEvent && window.onNomeraAndroidOtaEvent(${payload});"
        mainHandler.post {
            try {
                webView.evaluateJavascript(js, null)
            } catch (_: Exception) {}
        }
    }
}
