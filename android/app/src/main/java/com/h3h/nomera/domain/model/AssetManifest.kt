package com.h3h.nomera.domain.model

internal data class AssetEntry(
    val path: String,
    val version: String,
    val bytes: Long
)

internal data class AssetManifest(
    val schemaVersion: Int,
    val release: String,
    val files: Map<String, AssetEntry>
)
