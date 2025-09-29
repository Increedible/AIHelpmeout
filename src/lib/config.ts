// All tweakables in one place.
export const CONFIG = {
  // Theme
  DEFAULT_THEME: 'dark' as 'dark' | 'light',

  // Editor & panes
  UNDO_MAX_HISTORY: 500,          // cap we can enforce via soft snapshotting if needed
  MAX_CODE_SIZE: 200_000,         // characters
  MIN_PANEL_PERCENT: 25,          // resizing limit so panes never collapse

  // Prompt output animation
  STREAM_CHAR_RATE: 50,           // chars per second (roughly)
  MAX_STREAM_MS: 60_000,          // cut off long-running "typing" reveals

  // Language & provider defaults
  DEFAULT_LANGUAGE: 'javascript',
  PROVIDER_PREFERENCE: ['openai', 'gemini', 'anthropic'] as const,

  // UI strings (easy to adjust)
  STRINGS: {
    noToken:
      'No API key set for the selected model. Click “Tokens” and paste a key for this provider to proceed.',
    promptCancelled: 'Prompt cancelled by user.',
    prompting: 'Prompt in progress…',
    unchangedFromDefault: 'Code matches the default template for this language.',
    noChangesToSave: 'No changes vs last saved.',
    unsavedSwitch:
      'You have unsaved changes. Save before switching language?',
  }
};
