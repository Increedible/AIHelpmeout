// All tweakables in one place.
export const CONFIG = {
    // Theme
    DEFAULT_THEME: 'dark' as 'dark' | 'light',

    // Editor & panes
    UNDO_MAX_HISTORY: 500,
    MAX_CODE_SIZE: 200_000,
    MIN_PANEL_PERCENT: 25,

    // Prompt output animation
    STREAM_CHAR_RATE: 50,      // chars per second (approx)
    MAX_STREAM_MS: 60_000,

    // Language & provider defaults
    DEFAULT_LANGUAGE: 'javascript',
    PROVIDER_PREFERENCE: ['openai', 'gemini', 'anthropic'] as const,

    // Prompt configuration
    GLOBAL_PROMPT_DEFAULT: 'Analyse the differences between the two code samples only.',
    LANG_PROMPT_DEFAULT_PREFIX: 'Give one suggestion for improvement for ', // + language label
    GLOBAL_PROMPT_MAX: 1000,
    LANG_PROMPT_MAX: 1000,

    // UI strings
    STRINGS: {
        noToken:
            'No API key set for the selected model. Click "Tokens" and paste a key for this provider to proceed.',
        promptCancelled: 'Prompt cancelled by user.',
        prompting: 'Prompt in progress…',
        unchangedFromDefault: 'Code matches the default template for this language.',
        noChangesToSave: 'No changes vs last saved.',
        unsavedSwitch:
            'You have unsaved changes. Save before switching language?',
        noChangesSinceLastPrompt:
            'No changes to code or prompt text since the last prompt.'
    }
};
