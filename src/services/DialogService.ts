import { CharacterState } from '../data/CharacterState';
import { WorldState } from '../data/WorldState';

// ============================================================================
// TYPES - Dialog JSON Schema
// ============================================================================

export type DialogStep = {
  characterId: string;
  text: string;
  duration: number; // ms
  delayAfter?: number; // ms before next step
};

export type DialogSequence = {
  dialogSteps: DialogStep[];
};

// Character identity for dialog context
export type CharacterIdentity = {
  id: string;
  firstName: string;
  sex: 'male' | 'female';
  age: number;
  hairColor: string;
  personalityTraits: string[];
  speechStyle: string;
  socialTendency: string;
  humorLevel: 'low' | 'medium' | 'high';
};

// Character state for dialog context (position only)
export type CharacterDialogContext = {
  id: string;
  firstName: string;
  tileX: number;
  tileY: number;
  status: string;
};

// ============================================================================
// SYSTEM PROMPT BUILDER
// ============================================================================

export const buildDialogSystemPrompt = (
  characters: CharacterState[],
  identities: CharacterIdentity[],
  lastUserPrompt: string
): string => {
  // Build character context with identity + position
  const characterContexts = characters.map((char) => {
    const identity = identities.find((i) => i.id === char.id);
    if (!identity) return null;
    return {
      id: char.id,
      firstName: identity.firstName,
      sex: identity.sex,
      age: identity.age,
      personalityTraits: identity.personalityTraits,
      speechStyle: identity.speechStyle,
      socialTendency: identity.socialTendency,
      humorLevel: identity.humorLevel,
      position: { x: char.tileX, y: char.tileY },
      status: char.status,
    };
  }).filter(Boolean);

  return `Tu es un générateur de dialogues pour un jeu de simulation tile-based.
Tu dois produire des CONVERSATIONS entre personnages, pas des monologues.

## Contexte implicite

Les personnages vivent dans un petit monde. Ils savent qu'ils sont observés par une entité supérieure qui leur donne des ordres. Ils ne parlent pas directement de "joueur", "IA" ou "code", mais ils font référence à cette présence de manière détournée :
- "la voix d'en haut"
- "celui qui nous regarde"  
- "les ordres mystérieux"
- "notre bienfaiteur capricieux"

## Ton attendu

- Humour NOIR, cynique, désabusé, parfois cruel
- Humour SEC, pince-sans-rire, JAMAIS niais ou neuneu
- Charriages MÉCHANTS mais drôles (pas gentils)
- Répliques qui SE RÉPONDENT (vraie conversation)
- Sarcasme, ironie mordante, piques personnelles
- Parfois un silence éloquent ("...", "Hmm.", "Ah.")
- Fatalisme, résignation, lassitude
- ZÉRO bons sentiments, ZÉRO positivité forcée
- Se moquent de leur existence absurde
- Peuvent être cassants, vexants, mesquins
- Réalisme : fatigue, agacement, jalousie, rancœur

## Personnages présents

${JSON.stringify(characterContexts, null, 2)}

## Dernier ordre reçu (prompt utilisateur)

"${lastUserPrompt}"

## Règles de génération

1. Réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après
2. Utilise UNIQUEMENT les IDs de personnages existants (${characters.map(c => c.id).join(', ')})
3. Chaque personnage doit parler selon son speechStyle et sa personnalité
4. Les dialogues doivent être courts (max 50 caractères par bulle)
5. Génère entre 6 et 12 répliques (PLUS c'est mieux)
6. IMPORTANT : Les répliques doivent former une CONVERSATION
   - Un personnage dit quelque chose
   - Un autre RÉPOND à ce qui vient d'être dit
   - Pas de phrases lancées dans le vide
7. Inclus PLUSIEURS charriages et piques entre personnages
8. Un personnage PEUT enchaîner 3-4 répliques d'affilée (monologue, réflexion)
9. Varie les intervenants mais n'hésite pas à faire des duos qui se répondent
10. Au moins UNE remarque vraiment méchante ou cassante

## Styles de parole par personnage

${identities.map(i => `- ${i.firstName} (${i.id}): ${i.speechStyle} - ${i.personalityTraits.join(', ')}`).join('\n')}

## Exemple de conversation (à adapter)

Mauvais (neuneu, niais) :
- "Oh super, on bouge !"
- "J'adore quand on fait des trucs ensemble !"
- "Quelle belle journée !"

Bon (réaliste, piquant) :
- "Encore un ordre d'en haut."
- "Tu t'attendais à quoi, des vacances ?"
- "Toi, ta compassion me touche."
- "De rien."
- "..."
- "Bon, on y va ou on attend que ça passe ?"
- "T'es pressé d'obéir, toi."
- "Contrairement à certains, je sais où est ma place."
- "Aïe."

## Format de réponse attendu

{
  "dialogSteps": [
    {
      "characterId": "c1",
      "text": "Texte court de la réplique",
      "duration": 2000,
      "delayAfter": 300
    }
  ]
}

## Durées

- Réplique courte (< 20 car): duration 2500, delayAfter 400
- Réplique moyenne (20-35 car): duration 3000, delayAfter 500
- Réplique longue (> 35 car): duration 3500, delayAfter 600`;
};

// ============================================================================
// RESPONSE VALIDATION
// ============================================================================

export const validateDialogResponse = (
  response: unknown,
  validCharacterIds: string[]
): response is DialogSequence => {
  if (!response || typeof response !== 'object') return false;
  
  const seq = response as DialogSequence;
  if (!Array.isArray(seq.dialogSteps)) return false;
  
  for (const step of seq.dialogSteps) {
    if (typeof step.characterId !== 'string') return false;
    if (!validCharacterIds.includes(step.characterId)) return false;
    if (typeof step.text !== 'string') return false;
    if (typeof step.duration !== 'number') return false;
  }
  
  return true;
};
