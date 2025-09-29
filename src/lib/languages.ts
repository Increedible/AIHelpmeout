// Display label -> Monaco language id mapping
export const LANGUAGE_OPTIONS: Array<{label: string; id: string}> = [
  { label: 'Kotlin', id: 'kotlin' },
  { label: 'Java', id: 'java' },
  { label: 'C#', id: 'csharp' },
  { label: 'C/C++', id: 'cpp' },        // we’ll treat C and C++ both as cpp for tokenization
  { label: 'Python', id: 'python' },
  { label: 'HTML', id: 'html' },
  { label: 'CSS', id: 'css' },
  { label: 'JavaScript', id: 'javascript' }
];
// Monaco’s “basic-languages” include these (Kotlin is present too). 

export const languageLabelFromId = (id: string) =>
  LANGUAGE_OPTIONS.find(x => x.id === id)?.label ?? id;
