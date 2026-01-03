# Dialog System - Documentation

> **Last updated:** 2026-01-03

Ce document décrit le système de dialogue data-driven et comment il s'intègre avec OpenAI.

---

## 1. Schéma JSON du Dialogue

### Structure de sortie attendue du LLM

```json
{
  "dialogSteps": [
    {
      "characterId": "c1",
      "text": "Texte de la réplique",
      "duration": 2000,
      "delayAfter": 300
    },
    {
      "characterId": "c2",
      "text": "Réponse du personnage",
      "duration": 2500,
      "delayAfter": 400
    }
  ]
}
```

### Champs

| Champ | Type | Description |
|-------|------|-------------|
| `characterId` | string | ID du personnage (c1, c2, ...) |
| `text` | string | Texte de la réplique (max ~50 caractères) |
| `duration` | number | Durée d'affichage en ms |
| `delayAfter` | number | Délai avant la prochaine bulle en ms (optionnel) |

### Durées recommandées

| Longueur | duration | delayAfter |
|----------|----------|------------|
| Courte (< 20 car) | 2500 | 400 |
| Moyenne (20-35 car) | 3000 | 500 |
| Longue (> 35 car) | 3500 | 600 |

---

## 2. Identité des Personnages (charactersIdentity.json)

Chaque personnage possède :

```json
{
  "id": "c1",
  "firstName": "Marcel",
  "sex": "male",
  "age": 42,
  "hairColor": "brown",
  "personalityTraits": ["pragmatique", "protecteur", "légèrement bourru"],
  "speechStyle": "direct",
  "socialTendency": "leader",
  "humorLevel": "medium"
}
```

### Enums

**Sex**: `male` | `female`

**SpeechStyle**: 
- `direct` - Va droit au but
- `posé` - Calme, réfléchi
- `familier` - Langage courant, décontracté
- `sec` - Peu de mots, ton froid
- `lyrique` - Poétique, imagé
- `anecdotique` - Raconte des histoires
- `sarcastique` - Ironie mordante
- `doux` - Bienveillant, chaleureux
- `provocateur` - Cherche la réaction
- `laconique` - Très peu de mots

**SocialTendency**:
- `leader` - Prend les décisions
- `follower` - Suit le groupe
- `solitaire` - Préfère être seul
- `clown` - Fait rire les autres
- `observateur` - Regarde et commente

**HumorLevel**: `low` | `medium` | `high`

---

## 3. System Prompt OpenAI

Le prompt système est construit dynamiquement par `buildDialogSystemPrompt()` dans `src/services/DialogService.ts`.

### Données injectées

1. **Contexte des personnages** (identité + position actuelle)
2. **Dernier prompt utilisateur** (l'ordre de mouvement)
3. **Liste des IDs valides**
4. **Styles de parole par personnage**

### Contexte implicite

Les personnages :
- Savent qu'ils sont observés par une entité supérieure
- Réagissent aux ordres avec humour NOIR, cynique, désabusé
- Se charrient entre eux (parfois méchants mais drôles)
- Font de l'autodérision et du fatalisme amusé
- Utilisent l'ironie mordante et le sarcasme
- Peuvent se moquer de leur propre existence absurde
- Ne parlent jamais de "joueur", "IA" ou "code"

### Ton attendu

- Humour SEC, pince-sans-rire, jamais niais
- Répliques qui SE RÉPONDENT (vraie conversation, pas des phrases isolées)
- Sous-entendus, sarcasme, ironie mordante
- Parfois un silence éloquent ("...", "Hmm.")
- Pas de bons sentiments dégoulinants

### Références à l'entité supérieure

- "la voix d'en haut"
- "celui qui nous regarde"
- "les ordres mystérieux"
- "notre bienfaiteur capricieux"

---

## 4. Flux d'exécution dans l'App

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Utilisateur clique sur "Dial"                               │
├─────────────────────────────────────────────────────────────────┤
│  2. App récupère :                                              │
│     - characters (positions actuelles)                          │
│     - identities (personnalités)                                │
│     - lastUserPrompt (dernier ordre de mouvement)               │
├─────────────────────────────────────────────────────────────────┤
│  3. buildDialogSystemPrompt() construit le prompt               │
├─────────────────────────────────────────────────────────────────┤
│  4. Appel OpenAI avec :                                         │
│     - system: prompt construit                                  │
│     - user: "Génère un dialogue réactif"                        │
├─────────────────────────────────────────────────────────────────┤
│  5. Réponse JSON validée par validateDialogResponse()           │
├─────────────────────────────────────────────────────────────────┤
│  6. DialogSequence chargée dans dialogState                     │
├─────────────────────────────────────────────────────────────────┤
│  7. DialogSystem orchestre l'affichage séquentiel               │
│     - Fade in → Affichage → Fade out → Délai → Next             │
├─────────────────────────────────────────────────────────────────┤
│  8. DialogBubble affiche chaque bulle au-dessus du personnage   │
├─────────────────────────────────────────────────────────────────┤
│  9. Si le personnage est hors champ, la caméra se déplace       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `src/data/charactersIdentity.json` | Identités enrichies des personnages |
| `src/data/DialogState.ts` | Types et état du dialogue |
| `src/systems/DialogSystem.ts` | Orchestration des phases (fade, timing) |
| `src/services/DialogService.ts` | Prompt builder + validation |
| `src/ui/DialogBubble.tsx` | Composant UI de la bulle |
| `App.tsx` | Intégration et gestion d'état |

---

## 6. Exemple de dialogue généré

**Prompt utilisateur**: "Rejoignez tous c10"

**Dialogue généré**:
```json
{
  "dialogSteps": [
    { "characterId": "c9", "text": "Encore un ordre d'en haut...", "duration": 3000, "delayAfter": 500 },
    { "characterId": "c7", "text": "Tu t'attendais à quoi, des vacances ?", "duration": 3000, "delayAfter": 500 },
    { "characterId": "c9", "text": "Toi, ta compassion me touche.", "duration": 3000, "delayAfter": 400 },
    { "characterId": "c7", "text": "De rien.", "duration": 2500, "delayAfter": 500 },
    { "characterId": "c10", "text": "...", "duration": 2000, "delayAfter": 400 },
    { "characterId": "c2", "text": "Germaine est ravie, ça se voit.", "duration": 3000, "delayAfter": 0 }
  ]
}
```

---

## 7. Évolutions futures possibles

- [ ] Mémoire court terme (derniers dialogues)
- [ ] Réactions aux événements (arrivée à destination, collision)
- [ ] Dialogues contextuels selon les assets proches
- [ ] Émotions visuelles sur les personnages
- [ ] Choix de réponse utilisateur
