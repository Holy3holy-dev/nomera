package com.h3h.nomera.domain.usecase

import com.h3h.nomera.domain.model.AssetManifest
import com.h3h.nomera.domain.model.DeltaDownloadItem
import com.h3h.nomera.domain.model.DeltaDownloadReason
import com.h3h.nomera.domain.model.OtaDeltaPlan

internal class ComputeOtaDeltaPlanUseCase {

    operator fun invoke(
        localManifest: AssetManifest,
        remoteManifest: AssetManifest,
        overlayVersions: Map<String, String>
    ): OtaDeltaPlan {
        val toDownload = mutableListOf<DeltaDownloadItem>()
        val toDeleteSet = linkedSetOf<String>()
        var downloadBytes = 0L

        for ((rawPath, remoteEntry) in remoteManifest.files.entries.sortedBy { it.key }) {
            val relPath = normalizePath(rawPath)
            val localEntry = localManifest.files[relPath]
            val effectiveVersion = overlayVersions[relPath] ?: localEntry?.version

            if (effectiveVersion != remoteEntry.version) {
                val reason = if (localEntry != null) DeltaDownloadReason.UPDATED else DeltaDownloadReason.ADDED
                toDownload.add(
                    DeltaDownloadItem(
                        path = relPath,
                        version = remoteEntry.version,
                        bytes = remoteEntry.bytes,
                        reason = reason
                    )
                )
                downloadBytes += remoteEntry.bytes
            }
        }

        for (rawPath in localManifest.files.keys) {
            val relPath = normalizePath(rawPath)
            if (!remoteManifest.files.containsKey(relPath)) {
                toDeleteSet.add(relPath)
            }
        }

        for (rawPath in overlayVersions.keys) {
            val relPath = normalizePath(rawPath)
            if (!remoteManifest.files.containsKey(relPath)) {
                toDeleteSet.add(relPath)
            }
        }

        val toDelete = toDeleteSet.sorted()
        return OtaDeltaPlan(
            upToDate = toDownload.isEmpty() && toDelete.isEmpty(),
            fromRelease = localManifest.release,
            toRelease = remoteManifest.release,
            toDownload = toDownload,
            toDelete = toDelete,
            downloadBytes = downloadBytes
        )
    }

    private fun normalizePath(path: String): String {
        return path.trim()
            .removePrefix("./")
            .trimStart('/')
            .replace('\\', '/')
    }
}
