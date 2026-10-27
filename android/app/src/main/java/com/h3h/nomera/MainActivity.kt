package com.h3h.nomera

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
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

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#080D16"))
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
