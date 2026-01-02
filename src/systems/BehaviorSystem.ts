import { 
  CharacterState, 
  CharacterStatus, 
  IntentType, 
  FollowPolicy 
} from '../data/CharacterState';
import { WorldState } from '../data/WorldState';
import { GameEvent } from './EventBus';
import { processIntent } from './CharacterSystem';

export const processBehavior = (
  character: CharacterState,
  event: GameEvent,
  allCharacters: CharacterState[],
  world: WorldState
): CharacterState => {
  // For MOVE_TO_CHARACTER with WHEN_IDLE policy, re-evaluate when target becomes idle
  if (
    character.intent.type === IntentType.MOVE_TO_CHARACTER &&
    character.followPolicy === FollowPolicy.WHEN_IDLE &&
    character.status === CharacterStatus.IDLE
  ) {
    if (event.type === 'stateChanged' && event.payload?.status === 'idle') {
      if (event.characterId === character.intent.targetId) {
        return processIntent(character, allCharacters, world, true);
      }
    }
  }

  return character;
};
