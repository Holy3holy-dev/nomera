package com.h3h.nomera.domain.repository

import com.h3h.nomera.domain.model.AssetManifest
import com.h3h.nomera.domain.model.DeltaDownloadItem
import java.io.InputStream

internal interface AssetOverlayRepository {
    fun readEffectiveManifest(): AssetManifest
    fun readOverlayVersions(): Map<String, String>
    fun fetchRemoteManifest(baseUrl: String): AssetManifest?
    fun downloadAndStoreOverlayAsset(baseUrl: String, item: DeltaDownloadItem): Boolean
    fun deleteAssetFromOverlay(relPath: String)
    fun saveAppliedManifest(manifest: AssetManifest)
    fun openAssetStream(relPath: String): InputStream?
    fun guessMimeType(relPath: String): String
}
