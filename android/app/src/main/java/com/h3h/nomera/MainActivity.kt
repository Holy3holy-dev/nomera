package com.h3h.nomera

import android.annotation.SuppressLint
import android.app.Activity
import android.app.assist.AssistContent
import android.content.Intent
import android.graphics.Color
import android.graphics.Rect
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.ActionMode
import android.view.View
import android.view.ViewStructure
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import com.h3h.nomera.data.datasource.ApkBundledAssetDataSource
import com.h3h.nomera.data.datasource.LocalOtaOverlayDataSource
import com.h3h.nomera.data.datasource.RemoteManifestDataSource
import com.h3h.nomera.data.repository.AssetOverlayRepositoryImpl
import com.h3h.nomera.domain.usecase.ComputeOtaDeltaPlanUseCase
import com.h3h.nomera.domain.usecase.SyncGameAssetsUseCase
import com.h3h.nomera.ui.shell.NomeraJsBridge
import com.h3h.nomera.ui.shell.OverlayWebViewClient

class MainActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var jsBridge: NomeraJsBridge

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val repository = AssetOverlayRepositoryImpl(
            bundledDataSource = ApkBundledAssetDataSource(assets),
            overlayDataSource = LocalOtaOverlayDataSource(filesDir),
            remoteDataSource = RemoteManifestDataSource()
        )
        val syncUseCase = SyncGameAssetsUseCase(
            repository = repository,
            computeDeltaPlan = ComputeOtaDeltaPlanUseCase()
        )

        webView = object : WebView(this) {
            override fun performLongClick(): Boolean = true
            override fun performLongClick(x: Float, y: Float): Boolean = true
            override fun showContextMenu(): Boolean = true
            override fun showContextMenu(x: Float, y: Float): Boolean = true
            override fun startActionMode(callback: ActionMode.Callback?): ActionMode? = null
            override fun startActionMode(callback: ActionMode.Callback?, type: Int): ActionMode? = null
            override fun onProvideStructure(structure: ViewStructure?) {}
            override fun onProvideVirtualStructure(structure: ViewStructure?) {}
            override fun onProvideAutofillVirtualStructure(structure: ViewStructure?, flags: Int) {}
        }.apply {
            setBackgroundColor(Color.parseColor("#080D16"))
            isLongClickable = false
            isHapticFeedbackEnabled = false
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                importantForContentCapture = View.IMPORTANT_FOR_CONTENT_CAPTURE_NO_EXCLUDE_DESCENDANTS
            }
            setOnLongClickListener { true }
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = false
                allowContentAccess = false
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                setSupportZoom(false)
            }
            webViewClient = OverlayWebViewClient(repository)
            webChromeClient = WebChromeClient()
            setDownloadListener { url, _, _, _, _ ->
                openExternalUrl(url)
            }
            addOnLayoutChangeListener { v, _, top, _, bottom, _, _, _, _ ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val h = bottom - top
                    val w = v.width
                    if (w > 0 && h > 0) {
                        val zoneHeightPx = (200f * resources.displayMetrics.density).toInt().coerceAtMost(h)
                        v.systemGestureExclusionRects = listOf(
                            Rect(0, (h - zoneHeightPx).coerceAtLeast(0), w, h)
                        )
                    }
                }
            }
        }

        jsBridge = NomeraJsBridge(
            webView = webView,
            repository = repository,
            syncGameAssetsUseCase = syncUseCase
        )
        webView.addJavascriptInterface(jsBridge, "NomeraAndroidBridge")

        setContentView(webView)
        enableImmersiveFullscreen()
        webView.loadUrl(OverlayWebViewClient.ENTRY_URI.toString())

        // Trigger non-blocking delta OTA check against live website after launch
        jsBridge.triggerOtaSync(BuildConfig.DEFAULT_OTA_BASE_URL)
    }

    private fun openExternalUrl(url: String?) {
        if (url.isNullOrBlank()) return
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        } catch (_: Exception) {}
    }

    override fun onProvideAssistData(data: Bundle?) {
        // Block system Assistant / screen recognition inspection during gameplay
    }

    override fun onProvideAssistContent(outContent: AssistContent?) {
        // Block system Assistant / screen recognition inspection during gameplay
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            enableImmersiveFullscreen()
        }
    }

    @Deprecated("Deprecated in Java")
    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (this::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        if (this::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }

    @Suppress("DEPRECATION")
    private fun enableImmersiveFullscreen() {
        val decorView = window.decorView
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            decorView.windowInsetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                )
        }
    }
}
