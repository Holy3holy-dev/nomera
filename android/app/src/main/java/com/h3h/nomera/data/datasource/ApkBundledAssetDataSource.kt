package com.h3h.nomera.data.datasource

import android.content.res.AssetManager
import com.h3h.nomera.domain.model.AssetEntry
import com.h3h.nomera.domain.model.AssetManifest
import org.json.JSONObject
import java.io.InputStream

internal class ApkBundledAssetDataSource(
    private val assetManager: AssetManager
) {
    fun readBundledManifest(): AssetManifest {
        return try {
            val jsonText = assetManager.open("public/asset-manifest.json").bufferedReader().use { it.readText() }
            parseManifestJson(jsonText)
        } catch (_: Exception) {
            AssetManifest(schemaVersion = 1, release = "bundled", files = emptyMap())
        }
    }

    fun openBundledAsset(relPath: String): InputStream? {
        val clean = relPath.trim().removePrefix("./").trimStart('/')
        return try {
            assetManager.open("public/$clean")
        } catch (_: Exception) {
            // If desktop model path was requested on mobile APK, alias transparently to models-mobile
            if (clean.startsWith("assets/models/") && clean.endsWith(".glb")) {
                val mobileAlias = clean.replaceFirst("assets/models/", "assets/models-mobile/")
                return try {
                    assetManager.open("public/$mobileAlias")
                } catch (_: Exception) {
                    null
                }
            }
            null
        }
    }

    companion object {
        fun parseManifestJson(jsonText: String): AssetManifest {
            val root = JSONObject(jsonText)
            val schemaVersion = root.optInt("schemaVersion", 1)
            val release = root.optString("release", "unknown")
            val filesObj = root.optJSONObject("files") ?: JSONObject()
            val files = linkedMapOf<String, AssetEntry>()
            val keys = filesObj.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                val item = filesObj.optJSONObject(key) ?: continue
                val version = item.optString("version", "")
                val bytes = item.optLong("bytes", 0L)
                if (version.isNotEmpty()) {
                    files[key] = AssetEntry(path = key, version = version, bytes = bytes)
                }
            }
            return AssetManifest(schemaVersion = schemaVersion, release = release, files = files)
        }

        fun serializeManifestJson(manifest: AssetManifest): String {
            val root = JSONObject()
            root.put("schemaVersion", manifest.schemaVersion)
            root.put("release", manifest.release)
            val filesObj = JSONObject()
            for ((path, entry) in manifest.files) {
                val item = JSONObject()
                item.put("version", entry.version)
                item.put("bytes", entry.bytes)
                filesObj.put(path, item)
            }
            root.put("files", filesObj)
            return root.toString(2)
        }
    }
}
