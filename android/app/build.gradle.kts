plugins {
    id("com.android.application")
}

android {
    namespace = "com.h3h.nomera"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.h3h.nomera"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0-ota"
        // Default live site URL for automatic delta OTA updates
        buildConfigField("String", "DEFAULT_OTA_BASE_URL", "\"https://holy3holy-dev.github.io/nomera/\"")
    }

    buildFeatures {
        buildConfig = true
    }

    // Do not re-compress binary 3D models and audio inside the APK so AssetManager can stream/mmap them with zero overhead
    androidResources {
        noCompress += listOf("glb", "wasm", "mp3", "ogg", "wav", "webp", "png", "jpg")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }
}

dependencies {
}
