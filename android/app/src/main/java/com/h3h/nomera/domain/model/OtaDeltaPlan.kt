package com.h3h.nomera.domain.model

internal enum class DeltaDownloadReason {
    ADDED,
    UPDATED
}

internal data class DeltaDownloadItem(
    val path: String,
    val version: String,
    val bytes: Long,
    val reason: DeltaDownloadReason
)

internal data class OtaDeltaPlan(
    val upToDate: Boolean,
    val fromRelease: String?,
    val toRelease: String?,
    val toDownload: List<DeltaDownloadItem>,
    val toDelete: List<String>,
    val downloadBytes: Long
)

internal data class OtaSyncResult(
    val updated: Boolean,
    val release: String?,
    val downloadedCount: Int,
    val deletedCount: Int,
    val downloadBytes: Long,
    val error: String? = null
)
