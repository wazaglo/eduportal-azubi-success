export const KNOWLEDGE_LEVELS = ['SHS1', 'SHS2', 'SHS3'] as const;

export const SHS_SUBJECTS = [
  'English Language',
  'Core Mathematics',
  'Integrated Science',
  'Social Studies',
] as const;

export const KNOWLEDGE_BUCKET = process.env.KNOWLEDGE_BUCKET ?? '';
