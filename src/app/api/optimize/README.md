# API d'Optimisation de CV

Ce module fournit une API unifiée pour l'optimisation de CV avec l'intelligence artificielle dans CareerBoost.

## Structure

```
src/app/api/optimize/
├── route.ts                  # Point d'entrée principal de l'API
├── types.ts                  # Types partagés pour l'optimisation
├── README.md                 # Cette documentation
├── config/                   # Configuration
│   └── providers.ts          # Configuration des fournisseurs d'IA
└── services/                 # Services d'optimisation
    ├── index.ts              # Exportation de tous les services
    ├── extraction.ts         # Extraction de texte depuis les fichiers
    ├── file-handler.ts       # Gestion des fichiers temporaires
    ├── language.ts           # Détection de langue
    ├── user-mapping.ts       # Mappage des IDs utilisateurs
    └── optimization/         # Services d'optimisation avec IA
        ├── index.ts          # Orchestrateur d'optimisation
        ├── openai.ts         # Optimisation avec OpenAI
        ├── gemini.ts         # Optimisation avec Google Gemini
        ├── claude.ts         # Optimisation avec Anthropic Claude
        └── fallback.ts       # Générateur de secours
```

## Points d'entrée API

### POST /api/optimize

Point d'entrée principal pour l'optimisation et la réoptimisation des CV.

#### Paramètres

Pour une nouvelle optimisation:

- `fileUrl` - URL du fichier à optimiser (facultatif si `rawText` est fourni)
- `rawText` - Texte brut du CV (facultatif si `fileUrl` est fourni)
- `userId` - ID de l'utilisateur
- `fileName` - Nom du fichier (facultatif)
- `fileType` - Type du fichier (facultatif)

Pour la réoptimisation:

- `resumeId` - ID du CV à réoptimiser
- `userId` - ID de l'utilisateur
- `appliedKeywords` - Liste des mots-clés appliqués
- `appliedSuggestions` - Liste des suggestions appliquées

#### Réponse

```json
{
  "success": true,
  "optimizedText": "...",       // Texte optimisé au format HTML
  "suggestions": [...],         // Suggestions d'amélioration
  "keywordSuggestions": [...],  // Mots-clés suggérés
  "atsScore": 85,               // Score de compatibilité ATS
  "provider": "openai",         // Fournisseur d'IA utilisé
  "resumeId": "...",            // ID du CV (si sauvegardé)
  "data": {                     // Données supplémentaires
    "rawText": "...",
    "originalText": "...",
    "fileInfo": {...}
  }
}
```

## Cascade des Fournisseurs d'IA

L'API utilise une stratégie en cascade pour l'optimisation:

1. Essaie d'abord OpenAI (généralement meilleure qualité)
2. Si OpenAI échoue, utilise Gemini comme premier recours
3. Si Gemini échoue, utilise Claude comme dernier recours
4. Si tous les fournisseurs échouent, utilise un générateur de secours

## Fichiers et Formats Supportés

L'API supporte les formats suivants:

- PDF (`.pdf`)
- Documents Word (`.docx`)
- Fichiers texte (`.txt`)

## Langues Supportées

L'API détecte automatiquement la langue et optimise le CV dans cette langue:

- Anglais
- Français
- Espagnol
- Et autres langues supportées par les modèles IA

## Réoptimisation

La réoptimisation utilise le même fournisseur que l'optimisation initiale si possible. Si ce fournisseur n'est plus disponible, elle utilise la cascade standard.
