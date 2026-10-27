package com.h3h.nomera.data.datasource

import com.h3h.nomera.domain.model.AssetManifest
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.security.MessageDigest

internal class LocalOtaOverlayDataSource(
    baseDir: File
) {
    private val overlayRoot = File(baseDir, "ota-overlay").apply { mkdirs() }
    private val filesRoot = File(overlayRoot, "files").apply { mkdirs() }
    private val versionsFile = File(overlayRoot, "overlay-versions.json")
    private val deletedPathsFile = File(overlayRoot, "deleted-paths.json")
    private val appliedManifestFile = File(overlayRoot, "applied-manifest.json")

    @Synchronized
    fun readAppliedManifest(): AssetManifest? {
        if (!appliedManifestFile.exists()) return null
        return try {
            ApkBundledAssetDataSource.parseManifestJson(appliedManifestFile.readText())
        } catch (_: Exception) {
            null
        }
    }

    @Synchronized
    fun saveAppliedManifest(manifest: AssetManifest) {
        try {
            appliedManifestFile.writeText(ApkBundledAssetDataSource.serializeManifestJson(manifest))
        } catch (_: Exception) {}
    }

    @Synchronized
    fun readOverlayVersions(): Map<String, String> {
        if (!versionsFile.exists()) return emptyMap()
        return try {
            val json = JSONObject(versionsFile.readText())
            val out = linkedMapOf<String, String>()
            val keys = json.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                val v = json.optString(k, "")
                if (v.isNotEmpty() && resolveSafeFile(k).exists()) {
                    out[k] = v
                }
            }
            out
        } catch (_: Exception) {
            emptyMap()
        }
    }

    @Synchronized
    fun isMarkedDeleted(relPath: String): Boolean {
        val clean = normalizePath(relPath)
        return readDeletedSet().contains(clean)
    }

    @Synchronized
    fun openOverlayAsset(relPath: String): InputStream? {
        val clean = normalizePath(relPath)
        if (isMarkedDeleted(clean)) return null
        val target = resolveSafeFile(clean)
        if (target.exists() && target.isFile) {
            return FileInputStream(target)
        }
        if (clean.startsWith("assets/models/") && clean.endsWith(".glb")) {
            val mobileAlias = clean.replaceFirst("assets/models/", "assets/models-mobile/")
            val aliasFile = resolveSafeFile(mobileAlias)
            if (aliasFile.exists() && aliasFile.isFile) {
                return FileInputStream(aliasFile)
            }
        }
        return null
    }

    @Synchronized
    fun writeOverlayFileAtomically(relPath: String, bytes: ByteArray, expectedVersion: String): Boolean {
        val clean = normalizePath(relPath)
        val actualHash = sha256Short(bytes)
        if (expectedVersion.isNotEmpty() && actualHash != expectedVersion) {
            return false
        }

        val target = resolveSafeFile(clean)
        target.parentFile?.mkdirs()
        val temp = File(target.parentFile, "${target.name}.tmp")
        temp.writeBytes(bytes)
        if (target.exists()) target.delete()
        if (!temp.renameTo(target)) {
            temp.copyTo(target, overwrite = true)
            temp.delete()
        }

        val versions = readOverlayVersions().toMutableMap()
        versions[clean] = actualHash
        writeVersionsMap(versions)

        val deleted = readDeletedSet().toMutableSet()
        if (deleted.remove(clean)) {
            writeDeletedSet(deleted)
        }
        return true
    }

    @Synchronized
    fun deleteOverlayAsset(relPath: String) {
        val clean = normalizePath(relPath)
        val target = resolveSafeFile(clean)
        if (target.exists()) {
            target.delete()
            pruneEmptyParents(target.parentFile)
        }

        val versions = readOverlayVersions().toMutableMap()
        if (versions.remove(clean) != null) {
            writeVersionsMap(versions)
        }

        val deleted = readDeletedSet().toMutableSet()
        deleted.add(clean)
        writeDeletedSet(deleted)
    }

    private fun resolveSafeFile(relPath: String): File {
        val clean = normalizePath(relPath)
        val candidate = File(filesRoot, clean).canonicalFile
        val rootCanonical = filesRoot.canonicalFile
        require(candidate.path.startsWith(rootCanonical.path)) { "Invalid overlay path: $relPath" }
        return candidate
    }

    private fun pruneEmptyParents(dir: File?) {
        var current = dir
        val stopAt = filesRoot.canonicalFile
        while (current != null && current.canonicalFile != stopAt) {
            val children = current.listFiles()
            if (children != null && children.isEmpty()) {
                val parent = current.parentFile
                current.delete()
                current = parent
            } else {
                break
            }
        }
    }

    private fun writeVersionsMap(map: Map<String, String>) {
        val obj = JSONObject()
        for ((k, v) in map) obj.put(k, v)
        versionsFile.writeText(obj.toString(2))
    }

    private fun readDeletedSet(): Set<String> {
        if (!deletedPathsFile.exists()) return emptySet()
        return try {
            val arr = JSONArray(deletedPathsFile.readText())
            val set = linkedSetOf<String>()
            for (i in 0 until arr.length()) {
                val p = arr.optString(i, "")
                if (p.isNotEmpty()) set.add(p)
            }
            set
        } catch (_: Exception) {
            emptySet()
        }
    }

    private fun writeDeletedSet(set: Set<String>) {
        val arr = JSONArray()
        for (p in set.sorted()) arr.put(p)
        deletedPathsFile.writeText(arr.toString(2))
    }

    private fun normalizePath(path: String): String {
        return path.trim().removePrefix("./").trimStart('/').replace('\\', '/')
    }

    private fun sha256Short(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        val sb = StringBuilder(12)
        for (i in 0 until 6) {
            sb.append(String.format("%02x", digest[i]))
        }
        return sb.toString()
    }
}
