package com.h3h.nomera.data.repository

import com.h3h.nomera.data.datasource.ApkBundledAssetDataSource
import com.h3h.nomera.data.datasource.LocalOtaOverlayDataSource
import com.h3h.nomera.data.datasource.RemoteManifestDataSource
import com.h3h.nomera.domain.model.AssetManifest
import com.h3h.nomera.domain.model.DeltaDownloadItem
import com.h3h.nomera.domain.repository.AssetOverlayRepository
import java.io.InputStream
import java.util.Locale

internal class AssetOverlayRepositoryImpl(
    private val bundledDataSource: ApkBundledAssetDataSource,
    private val overlayDataSource: LocalOtaOverlayDataSource,
    private val remoteDataSource: RemoteManifestDataSource
) : AssetOverlayRepository {

    override fun readEffectiveManifest(): AssetManifest {
        return overlayDataSource.readAppliedManifest() ?: bundledDataSource.readBundledManifest()
    }

    override fun readOverlayVersions(): Map<String, String> {
        return overlayDataSource.readOverlayVersions()
    }

    override fun fetchRemoteManifest(baseUrl: String): AssetManifest? {
        return remoteDataSource.fetchManifest(baseUrl)
    }

    override fun downloadAndStoreOverlayAsset(baseUrl: String, item: DeltaDownloadItem): Boolean {
        val bytes = remoteDataSource.downloadAssetBytes(baseUrl, item.path, item.version) ?: return false
        return overlayDataSource.writeOverlayFileAtomically(item.path, bytes, item.version)
    }

    override fun deleteAssetFromOverlay(relPath: String) {
        overlayDataSource.deleteOverlayAsset(relPath)
    }

    override fun saveAppliedManifest(manifest: AssetManifest) {
        overlayDataSource.saveAppliedManifest(manifest)
    }

    override fun openAssetStream(relPath: String): InputStream? {
        val clean = if (relPath.isBlank() || relPath == "/") "index.html" else relPath.trimStart('/')
        if (overlayDataSource.isMarkedDeleted(clean)) return null
        return overlayDataSource.openOverlayAsset(clean) ?: bundledDataSource.openBundledAsset(clean)
    }

    override fun guessMimeType(relPath: String): String {
        val lower = relPath.lowercase(Locale.ROOT).substringBefore('?')
        return when {
            lower.endsWith(".html") || lower == "/" || lower.isEmpty() -> "text/html"
            lower.endsWith(".js") || lower.endsWith(".mjs") -> "text/javascript"
            lower.endsWith(".css") -> "text/css"
            lower.endsWith(".json") || lower.endsWith(".webmanifest") -> "application/json"
            lower.endsWith(".glb") -> "model/gltf-binary"
            lower.endsWith(".wasm") -> "application/wasm"
            lower.endsWith(".svg") -> "image/svg+xml"
            lower.endsWith(".webp") -> "image/webp"
            lower.endsWith(".png") -> "image/png"
            lower.endsWith(".jpg") || lower.endsWith(".jpeg") -> "image/jpeg"
            lower.endsWith(".mp3") -> "audio/mpeg"
            lower.endsWith(".ogg") -> "audio/ogg"
            lower.endsWith(".wav") -> "audio/wav"
            lower.endsWith(".woff2") -> "font/woff2"
            lower.endsWith(".woff") -> "font/woff"
            lower.endsWith(".ttf") -> "font/ttf"
            else -> "application/octet-stream"
        }
    }
}
