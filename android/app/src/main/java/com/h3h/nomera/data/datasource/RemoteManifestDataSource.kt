package com.h3h.nomera.data.datasource

import com.h3h.nomera.domain.model.AssetManifest
import java.net.HttpURLConnection
import java.net.URL

internal class RemoteManifestDataSource {

    fun fetchManifest(baseUrl: String): AssetManifest? {
        val normalizedBase = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        val url = URL("${normalizedBase}asset-manifest.json?t=${System.currentTimeMillis()}")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 8000
            readTimeout = 12000
            useCaches = false
            setRequestProperty("Cache-Control", "no-cache")
        }
        return try {
            if (conn.responseCode !in 200..299) return null
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            ApkBundledAssetDataSource.parseManifestJson(body)
        } catch (_: Exception) {
            null
        } finally {
            conn.disconnect()
        }
    }

    fun downloadAssetBytes(baseUrl: String, relPath: String, version: String): ByteArray? {
        val normalizedBase = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        val cleanPath = relPath.trim().removePrefix("./").trimStart('/')
        val url = URL("${normalizedBase}${cleanPath}?v=${version}")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 10000
            readTimeout = 30000
            useCaches = false
        }
        return try {
            if (conn.responseCode !in 200..299) return null
            conn.inputStream.use { it.readBytes() }
        } catch (_: Exception) {
            null
        } finally {
            conn.disconnect()
        }
    }
}
