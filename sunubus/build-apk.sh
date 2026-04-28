#!/bin/bash
# build-apk.sh — Script de build automatisé pour SunuBus
# Usage: ./build-apk.sh [debug|release]

set -e

MODE=${1:-debug}
echo "========================================"
echo "  SunuBus — Build APK ($MODE)"
echo "========================================"

# Vérifier prérequis
command -v node >/dev/null 2>&1 || { echo "❌ Node.js requis"; exit 1; }
command -v java >/dev/null 2>&1 || { echo "❌ Java JDK requis"; exit 1; }
[ -n "$ANDROID_HOME" ] || { echo "❌ ANDROID_HOME non défini"; exit 1; }

echo "✓ Node.js : $(node --version)"
echo "✓ Java    : $(java -version 2>&1 | head -1)"
echo "✓ Android SDK : $ANDROID_HOME"
echo ""

# 1. Install
if [ ! -d "node_modules" ]; then
  echo "📦 Installation des dépendances..."
  npm install
fi

# 2. Build web
echo "🔨 Compilation du frontend..."
npm run build

# 3. Add Android (si nécessaire)
if [ ! -d "android" ]; then
  echo "📱 Initialisation de la plateforme Android..."
  npx cap add android
fi

# 4. Sync
echo "🔄 Synchronisation Capacitor..."
npx cap sync android

# 5. Build APK
echo "🏗️  Compilation APK ($MODE)..."
cd android

if [ "$MODE" = "release" ]; then
  ./gradlew assembleRelease
  APK_PATH="app/build/outputs/apk/release/app-release.apk"
else
  ./gradlew assembleDebug
  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

cd ..

# Résultat
if [ -f "android/$APK_PATH" ]; then
  SIZE=$(du -h "android/$APK_PATH" | cut -f1)
  echo ""
  echo "✅ APK généré avec succès !"
  echo "   📍 android/$APK_PATH"
  echo "   📦 Taille : $SIZE"
  echo ""
  echo "Pour installer sur un téléphone connecté en USB :"
  echo "   adb install android/$APK_PATH"
else
  echo "❌ Échec de la génération de l'APK"
  exit 1
fi
