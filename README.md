# SunuBus Senegal

Prototype front-end d'application de suivi de bus en temps reel pour Dakar et sa banlieue.

## Ce que contient cette v3 (Specification Real-time)

- suivi visuel de plusieurs lignes de bus (Simulation & API)
- **Geolocalisation**: detection automatique de l'arret le plus proche
- **Scanner QR**: simulation de gestion de la montee (billettique)
- **Planificateur**: trajets directs ou avec correspondance
- recherche d'arrets et de lignes avec favoris persistants
- interface premium "Fintech style" inspiree par la densite d'information moderne

## Lancer le projet

```bash
npm install
npm run server
npm run dev
```

Le frontend tente d'utiliser l'API locale sur `http://localhost:8787`.
Si le serveur n'est pas lance, il bascule automatiquement sur la simulation locale.

## Build production

```bash
npm run build
```

## Suite recommandee

1. ajouter un backend pour recevoir la position GPS des bus
2. stocker les lignes, arrets et horaires dans une base
3. exposer une API temps reel
4. emballer l'application en APK Android si besoin
