import { DialogState, DialogStep } from '../data/DialogState';

const FADE_DURATION = 300; // ms for fade in/out

export type DialogUpdate = {
  state: DialogState;
  scheduleNext?: number; // ms until next update
};

// Start showing the current step
export const startCurrentStep = (state: DialogState): DialogUpdate => {
  if (!state.isPlaying || state.currentStepIndex >= state.steps.length) {
    return {
      state: {
        ...state,
        isPlaying: false,
        currentBubble: null,
      },
    };
  }

  const step = state.steps[state.currentStepIndex];
  console.log(`[DIALOG] Starting step ${state.currentStepIndex}: ${step.characterId} says "${step.text}"`);

  return {
    state: {
      ...state,
      currentBubble: {
        characterId: step.characterId,
        text: step.text,
        opacity: 0,
      },
    },
    scheduleNext: FADE_DURATION, // Schedule fade in completion
  };
};

// Complete fade in
export const completeFadeIn = (state: DialogState): DialogUpdate => {
  if (!state.currentBubble) {
    return { state };
  }

  const step = state.steps[state.currentStepIndex];
  
  return {
    state: {
      ...state,
      currentBubble: {
        ...state.currentBubble,
        opacity: 1,
      },
    },
    scheduleNext: step.duration, // Schedule start of fade out
  };
};

// Start fade out
export const startFadeOut = (state: DialogState): DialogUpdate => {
  if (!state.currentBubble) {
    return { state };
  }

  return {
    state: {
      ...state,
      currentBubble: {
        ...state.currentBubble,
        opacity: 0,
      },
    },
    scheduleNext: FADE_DURATION, // Schedule fade out completion
  };
};

// Complete fade out and move to next step
export const completeFadeOut = (state: DialogState): DialogUpdate => {
  const step = state.steps[state.currentStepIndex];
  const delayAfter = step?.delayAfter ?? 0;
  const nextIndex = state.currentStepIndex + 1;

  console.log(`[DIALOG] Step ${state.currentStepIndex} complete, next: ${nextIndex}`);

  if (nextIndex >= state.steps.length) {
    console.log('[DIALOG] Dialog sequence complete');
    return {
      state: {
        ...state,
        isPlaying: false,
        currentStepIndex: nextIndex,
        currentBubble: null,
      },
    };
  }

  return {
    state: {
      ...state,
      currentStepIndex: nextIndex,
      currentBubble: null,
    },
    scheduleNext: delayAfter, // Schedule next step start
  };
};

// Dialog phase enum for orchestration
export enum DialogPhase {
  IDLE = 'IDLE',
  FADE_IN = 'FADE_IN',
  SHOWING = 'SHOWING',
  FADE_OUT = 'FADE_OUT',
  DELAY = 'DELAY',
}
