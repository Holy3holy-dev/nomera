package com.h3h.nomera.domain.usecase

import com.h3h.nomera.domain.model.OtaSyncResult
import com.h3h.nomera.domain.repository.AssetOverlayRepository

internal class SyncGameAssetsUseCase(
    private val repository: AssetOverlayRepository,
    private val computeDeltaPlan: ComputeOtaDeltaPlanUseCase
) {
    operator fun invoke(
        remoteBaseUrl: String,
        onProgress: ((current: Int, total: Int, path: String) -> Unit)? = null
    ): OtaSyncResult {
        val localManifest = repository.readEffectiveManifest()
        val overlayVersions = repository.readOverlayVersions()
        val remoteManifest = repository.fetchRemoteManifest(remoteBaseUrl)
            ?: return OtaSyncResult(
                updated = false,
                release = localManifest.release,
                downloadedCount = 0,
                deletedCount = 0,
                downloadBytes = 0L,
                error = "manifest_unreachable"
            )

        val plan = computeDeltaPlan(localManifest, remoteManifest, overlayVersions)
        if (plan.upToDate) {
            repository.saveAppliedManifest(remoteManifest)
            return OtaSyncResult(
                updated = false,
                release = remoteManifest.release,
                downloadedCount = 0,
                deletedCount = 0,
                downloadBytes = 0L
            )
        }

        var deletedCount = 0
        for (obsoletePath in plan.toDelete) {
            repository.deleteAssetFromOverlay(obsoletePath)
            deletedCount++
        }

        var downloadedCount = 0
        val total = plan.toDownload.size
        for ((idx, item) in plan.toDownload.withIndex()) {
            onProgress?.invoke(idx + 1, total, item.path)
            val ok = repository.downloadAndStoreOverlayAsset(remoteBaseUrl, item)
            if (!ok) {
                return OtaSyncResult(
                    updated = false,
                    release = localManifest.release,
                    downloadedCount = downloadedCount,
                    deletedCount = deletedCount,
                    downloadBytes = plan.downloadBytes,
                    error = "download_failed:${item.path}"
                )
            }
            downloadedCount++
        }

        repository.saveAppliedManifest(remoteManifest)
        return OtaSyncResult(
            updated = true,
            release = remoteManifest.release,
            downloadedCount = downloadedCount,
            deletedCount = deletedCount,
            downloadBytes = plan.downloadBytes
        )
    }
}
