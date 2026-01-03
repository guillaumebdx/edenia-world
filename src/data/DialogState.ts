// Dialog step from JSON
export type DialogStep = {
  characterId: string;
  text: string;
  duration: number; // ms
  delayAfter?: number; // ms delay before next step
};

// Dialog sequence from JSON
export type DialogSequence = {
  dialogSteps: DialogStep[];
};

// Current dialog state
export type DialogState = {
  isPlaying: boolean;
  currentStepIndex: number;
  steps: DialogStep[];
  currentBubble: {
    characterId: string;
    text: string;
    opacity: number; // 0-1 for fade
  } | null;
};

// Initial state
export const createDialogState = (): DialogState => ({
  isPlaying: false,
  currentStepIndex: 0,
  steps: [],
  currentBubble: null,
});

// Load dialog sequence
export const loadDialogSequence = (
  state: DialogState,
  sequence: DialogSequence
): DialogState => ({
  ...state,
  isPlaying: true,
  currentStepIndex: 0,
  steps: sequence.dialogSteps,
  currentBubble: null,
});

// Clear dialog state
export const clearDialogState = (): DialogState => ({
  isPlaying: false,
  currentStepIndex: 0,
  steps: [],
  currentBubble: null,
});
