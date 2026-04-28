# SunuBus — Application Voyageur v5.0

Application mobile de suivi des bus **Dakar Dem Dikk (DDD)** et **TATA / AFTU** à Dakar et sa banlieue.

## Architecture

- **Frontend** : TypeScript + Vite + Leaflet.js
- **Mobile** : Capacitor 6 (Android, prêt pour iOS)
- **Réseau** : 13 lignes simulées (8 DDD + 5 TATA), 24 arrêts, ~50 bus en simulation temps réel
- **Stockage local** : `localStorage` pour favoris et préférences

## Structure

```
sunubus/
├── index.html              # Point d'entrée HTML
├── package.json
├── tsconfig.json
├── vite.config.ts
├── capacitor.config.json   # Configuration Capacitor (Android)
├── public/
│   ├── manifest.json       # PWA manifest
│   └── icon.svg            # Icône app
├── server/
│   └── index.js            # Serveur dev positions GPS
└── src/
    ├── main.ts             # Logique application
    ├── data.ts             # Réseau (lignes, arrêts, simulation)
    ├── store.ts            # État (favoris, préférences)
    └── style.css           # Styles
```

## Fonctionnalités implémentées

- 🗺️ **Carte interactive** Leaflet avec tracés des 13 lignes
- 🚌 **~50 bus en simulation temps réel** (mise à jour toutes les 4s)
- 🔍 **Recherche unifiée** lignes / arrêts / quartiers
- 🛣️ **Planificateur d'itinéraires** : direct + correspondance, 3 préférences
- 🧭 **Navigation guidée** étape par étape
- 📍 **Géolocalisation** + arrêts les plus proches
- ⭐ **Favoris persistants** lignes et arrêts
- 👤 **Profil & paramètres** (préférences, langue, notifications)
- 📱 **Bottom nav 5 onglets** + design mobile-first
- 🎨 **PWA-ready** (manifest + service worker prêts)

---

## 1. Lancement en mode web (développement)

```bash
# Installation
npm install

# Lancer le serveur de développement
npm run dev
# → http://localhost:5173

# Optionnel : lancer le serveur de positions GPS
npm run server
# → http://localhost:8787
```

## 2. Build production web

```bash
npm run build
# → dossier dist/ prêt à déployer (Vercel, Netlify, etc.)

npm run preview  # tester le build localement
```

---

## 3. Compilation de l'APK Android

### Prérequis (à installer une seule fois)

| Outil | Version | Lien |
|---|---|---|
| Node.js | ≥ 18 | https://nodejs.org |
| Java JDK | 17 | https://adoptium.net |
| Android Studio | Récent | https://developer.android.com/studio |
| Android SDK | API 34+ | (inclus dans Android Studio) |

Variables d'environnement (Windows PowerShell) :
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools"
```

### Étapes de build

```bash
# 1. Installer les dépendances et builder le web
npm install
npm run build

# 2. Initialiser la plateforme Android (une seule fois)
npx cap add android

# 3. Synchroniser les fichiers web vers le projet Android
npx cap sync android

# 4. Compiler l'APK debug (pour tests)
cd android
./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk

# 5. (Production) Compiler un APK release signé
./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

### Signature de l'APK release

```bash
# Générer une clé (une fois)
keytool -genkey -v -keystore sunubus-release.keystore \
  -alias sunubus -keyalg RSA -keysize 2048 -validity 10000

# Configurer android/app/build.gradle :
# android {
#   signingConfigs {
#     release {
#       storeFile file('../../sunubus-release.keystore')
#       storePassword 'VotreMotDePasse'
#       keyAlias 'sunubus'
#       keyPassword 'VotreMotDePasse'
#     }
#   }
#   buildTypes {
#     release {
#       signingConfig signingConfigs.release
#       minifyEnabled true
#     }
#   }
# }
```

### Ouvrir directement dans Android Studio

```bash
npx cap open android
# Puis : Build → Build Bundle(s) / APK(s) → Build APK(s)
```

### Installer l'APK sur un téléphone

```bash
# Via USB (téléphone en mode développeur, USB debugging activé)
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Ou copier le .apk sur le téléphone et taper dessus
# (autoriser les sources inconnues)
```

---

## 4. Déploiement sur Vercel (Web)

```bash
# Via la CLI Vercel
npm i -g vercel
vercel --prod

# Ou via GitHub : push → import dans Vercel → deploy auto
```

---

## 5. Permissions Android

À ajouter dans `android/app/src/main/AndroidManifest.xml` (auto-généré par Capacitor) :

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
```

---

## 6. Données réseau

Les 13 lignes incluses sont :

**DDD (8)** : C1, C2, C6, 7, 10, 15, 27, 54
**TATA (5)** : T1, T2, T3, T5, T8

Les arrêts couvrent : Plateau, Sandaga, Médina, UCAD, VDN, Parcelles, Guédiawaye, Pikine, Yoff, Almadies, Rufisque, AIBD, etc.

Pour ajouter de nouvelles lignes, éditer `src/data.ts`.

---

## 7. Limitations actuelles

- Les positions GPS des bus sont **simulées** (pas de connexion à un vrai GPS embarqué)
- Le calcul d'itinéraire est **simplifié** (ne couvre pas tous les cas de correspondance)
- L'authentification utilisateur est **prévue** mais non implémentée
- La billettique QR (scanner) est **prévue** via plugin Capacitor Camera

---

## Licence

© 2026 — SunuBus / Gravity — Dakar, Sénégal
