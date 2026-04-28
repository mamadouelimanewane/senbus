# Compiler l'APK SunuBus en 5 commandes

## Prérequis (à installer une fois)

1. **Node.js 18+** : https://nodejs.org
2. **Java JDK 17** : https://adoptium.net (Eclipse Temurin)
3. **Android Studio** : https://developer.android.com/studio
   - Lors de l'installation, accepter l'installation du SDK Android (API 34)
4. **Variables d'environnement** :
   - `JAVA_HOME` → dossier JDK 17
   - `ANDROID_HOME` → `%LOCALAPPDATA%\Android\Sdk` (Windows) ou `~/Library/Android/sdk` (Mac)

## Compilation (les 5 commandes)

```bash
# 1. Dans le dossier sunubus/
npm install

# 2. Compiler le web
npm run build

# 3. Ajouter Android (une seule fois)
npx cap add android

# 4. Synchroniser
npx cap sync android

# 5. Compiler l'APK debug
cd android && ./gradlew assembleDebug
```

## Récupérer l'APK

L'APK se trouve à :
```
sunubus/android/app/build/outputs/apk/debug/app-debug.apk
```

Taille attendue : ~6-8 MB

## Installer sur téléphone

**Méthode 1 — câble USB (téléphone en mode développeur)** :
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Méthode 2 — manuel** :
1. Copier l'APK sur le téléphone (USB, Drive, email…)
2. Sur le téléphone : Paramètres → Sécurité → "Sources inconnues" → activer
3. Taper sur le fichier .apk → Installer

## Build release signé (production)

```bash
# Créer une clé (une fois)
keytool -genkey -v -keystore sunubus.keystore \
  -alias sunubus -keyalg RSA -keysize 2048 -validity 10000

# Compiler en release
cd android && ./gradlew assembleRelease

# APK signé : android/app/build/outputs/apk/release/app-release.apk
```

## Problèmes fréquents

| Erreur | Solution |
|---|---|
| `JAVA_HOME not set` | Définir variable d'environnement `JAVA_HOME` |
| `SDK not found` | Définir `ANDROID_HOME` ou ouvrir une fois Android Studio |
| `gradlew: permission denied` | `chmod +x android/gradlew` (Mac/Linux) |
| `Could not resolve dependencies` | Vérifier connexion internet, relancer `./gradlew assembleDebug --refresh-dependencies` |
| Build trop long la 1re fois | Normal : Gradle télécharge ~500 MB de dépendances |

## Test rapide sans APK : navigateur

```bash
npm run dev
# Ouvrir http://localhost:5173 sur le téléphone (même Wi-Fi)
# Ou utiliser ngrok pour tester depuis n'importe où
```
