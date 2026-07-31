export const KNOWLEDGE_LEVELS = ['SHS1', 'SHS2', 'SHS3'] as const;

export const SHS_SUBJECTS = [
  'English Language',
  'Core Mathematics',
  'Integrated Science',
  'Social Studies',
  'ICT',
  'Computing',
  'Biology',
  'Chemistry',
  'Physics',
  'Elective Mathematics',
  'Financial Accounting',
  'Accounting',
  'Business Management',
  'Economics',
  'Geography',
  'History',
  'Government',
  'Literature in English',
  'French',
  'Ghanaian Language',
  'Visual Arts',
  'Music',
  'Food and Nutrition',
  'Clothing and Textiles',
  'Management in Living',
  'Agriculture Science',
  'Technical Drawing',
  'Physical Education',
] as const;

export const KNOWLEDGE_BUCKET = process.env.KNOWLEDGE_BUCKET ?? '';
