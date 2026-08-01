import { SHS_SUBJECTS } from '../utils/knowledge-constants';

// Retrieval tuning constants.
export const TITLE_TERM_BONUS = 8;
export const PROXIMITY_BONUS = 10;
export const PROXIMITY_BONUS_MAX = 40;
export const MIN_CONFIDENT_SCORE = 15;
export const MIN_WEAK_SCORE = 3;
export const WEAK_MATCH_NOTE =
  '[Note: the knowledge base only touches on this topic. The closest curriculum excerpt is shown above; ' +
  'ask your teacher or check your textbook for a fuller explanation.]';
// A document is accepted on a single distinct matched term only when that
// term occurs frequently enough that the match is clearly on-topic and not a
// lone, incidental mention.
export const SINGLE_TERM_MIN_COUNT = 5;
// Curriculum documents carry generic teacher-guidance blocks (e.g. NaCCA
// "National Core Values") that repeat subject terms in a short span. They
// would otherwise dominate term-frequency scoring and excerpt selection, so
// text inside a block flagged by one of these markers is ignored for
// retrieval purposes.
const BOILERPLATE_MARKERS = ['national core values', 'core competencies', 'social emotional learning'];
const BOILERPLATE_MAX_SPAN = 6000;

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'what', 'how', 'why', 'is', 'are', 'was', 'were', 'to', 'of',
  'a', 'an', 'in', 'on', 'at', 'this', 'that', 'these', 'those', 'your', 'you', 'me', 'my',
  'about', 'using', 'use', 'used', 'which', 'who', 'whom', 'where', 'when', 'do', 'does', 'did',
  'explain', 'describe', 'define', 'give', 'tell', 'what', 'show', 'list', 'state', 'name', 'also',
]);

export function tokenize(question: string): string[] {
  return question.toLowerCase().split(/[^a-z0-9]+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

export function detectSubject(question: string): string | null {
  const q = question.toLowerCase();

  // Exact subject-name match (handles multi-word names like "Core Mathematics").
  for (const subject of SHS_SUBJECTS) {
    if (q.includes(subject.toLowerCase())) {
      return subject;
    }
  }

  // Common aliases for subjects students are likely to type.
  const aliases: Record<string, string> = {
    maths: 'Core Mathematics',
    math: 'Core Mathematics',
    mathematics: 'Core Mathematics',
    'core maths': 'Core Mathematics',
    'core math': 'Core Mathematics',
    'integrated science': 'Integrated Science',
    'general science': 'Integrated Science',
    science: 'Integrated Science',
    'social studies': 'Social Studies',
    english: 'English Language',
    'english language': 'English Language',
  };

  const tokens = q.split(/\s+/);
  for (const token of tokens) {
    const alias = aliases[token.replace(/[^a-z]/g, '')];
    if (alias) {
      return alias;
    }
  }

  // Subject-topic keyword hints, only used when no subject name/alias matched.
  // Matched as whole words to avoid false positives.
  const subjectKeywords: Record<string, string[]> = {
    'English Language': ['noun', 'verb', 'grammar', 'essay', 'comprehension', 'vocabulary', 'sentence', 'tense', 'spelling', 'adjective', 'pronoun', 'adverb', 'conjunction', 'preposition', 'reading', 'writing'],
    'Core Mathematics': ['equation', 'algebra', 'geometry', 'trigonom', 'calculus', 'fraction', 'graph', 'probability', 'statistic', 'mean', 'median', 'mode', 'percentage', 'ratio', 'number', 'area', 'volume', 'quadratic', 'logarithm', 'indices'],
    'Integrated Science': ['cell', 'organism', 'photosynthesis', 'respiration', 'enzyme', 'tissue', 'ecosystem', 'atom', 'molecule', 'compound', 'chemical', 'periodic', 'acid', 'base', 'reaction', 'element', 'force', 'energy', 'motion', 'velocity', 'acceleration', 'electricity', 'magnetism', 'wave', 'gravity', 'current', 'voltage', 'light', 'soil', 'microscope', 'disease', 'nutrition'],
    'Social Studies': ['society', 'community', 'citizenship', 'culture', 'values', 'family', 'population', 'environment', 'development', 'governance', 'tolerance', 'human right', 'democracy', 'economy', 'resources'],
  };

  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    if (keywords.some(k => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(q))) {
      return subject;
    }
  }

  return null;
}

export function findBoilerplateRanges(content: string): Array<[number, number]> {
  const lower = content.toLowerCase();
  const ranges: Array<[number, number]> = [];
  for (const marker of BOILERPLATE_MARKERS) {
    let idx = lower.indexOf(marker);
    while (idx !== -1) {
      const searchStart = idx + marker.length;
      let end = Math.min(lower.length, idx + BOILERPLATE_MAX_SPAN);
      for (const other of BOILERPLATE_MARKERS) {
        const otherIdx = lower.indexOf(other, searchStart);
        if (otherIdx !== -1 && otherIdx < end) end = otherIdx;
      }
      ranges.push([idx, end]);
      idx = lower.indexOf(marker, end);
    }
  }
  return ranges.sort((a, b) => a[0] - b[0]);
}

export function inBoilerplate(ranges: Array<[number, number]>, position: number): boolean {
  for (const [start, end] of ranges) {
    if (position >= start && position < end) return true;
    if (position < start) return false;
  }
  return false;
}

export function countWordMatches(term: string, text: string, boilerplateRanges: Array<[number, number]>): number {
  const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
  let count = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!inBoilerplate(boilerplateRanges, m.index)) count++;
  }
  return count;
}

export interface RelevanceResult {
  score: number;
  distinctMatched: number;
  maxTermCount: number;
}

export function calculateRelevance(questionTerms: string[], title: string, content: string): RelevanceResult {
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();
  const boilerplateRanges = findBoilerplateRanges(lowerContent);

  let contentScore = 0;
  let distinctMatched = 0;
  let maxTermCount = 0;
  for (const term of questionTerms) {
    const count = countWordMatches(term, lowerContent, boilerplateRanges);
    if (count > 0) {
      distinctMatched++;
      if (count > maxTermCount) maxTermCount = count;
    }
    contentScore += Math.min(count, 15);
  }

  let titleScore = 0;
  for (const term of questionTerms) {
    if (countWordMatches(term, lowerTitle, []) > 0) {
      titleScore += TITLE_TERM_BONUS;
    }
  }

  const proximityBonus = calculateProximity(questionTerms, lowerContent);

  // Density-aware: normalise raw term frequency by document size so long
  // documents that merely repeat a word do not dominate focused sections.
  const lengthNormalized = contentScore / Math.sqrt(Math.max(lowerContent.length, 1));

  const score = Math.round(lengthNormalized * 100) + titleScore + proximityBonus;
  return { score, distinctMatched, maxTermCount };
}

export function calculateProximity(questionTerms: string[], content: string): number {
  let bonus = 0;
  for (let i = 0; i < questionTerms.length - 1; i++) {
    const a = escapeRegExp(questionTerms[i]!);
    const b = escapeRegExp(questionTerms[i + 1]!);
    // Terms appearing within ~3 words of each other suggest a related passage.
    const re = new RegExp(`\\b${a}\\s+(?:\\w+\\s+){0,3}${b}\\b`);
    if (re.test(content)) bonus += PROXIMITY_BONUS;
  }
  return Math.min(bonus, PROXIMITY_BONUS_MAX);
}

export function extractRelevantExcerpt(content: string, questionTerms: string[], maxChars: number): string {
  const lower = content.toLowerCase();
  const boilerplateRanges = findBoilerplateRanges(lower);

  // Collect every term occurrence and find the densest window of matches,
  // ignoring matches inside generic curriculum guidance blocks.
  const positions: number[] = [];
  for (const term of questionTerms) {
    const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'g');
    let m;
    while ((m = re.exec(lower)) !== null) {
      if (!inBoilerplate(boilerplateRanges, m.index)) {
        positions.push(m.index);
        if (positions.length >= 200) break;
      }
    }
  }

  if (positions.length === 0) {
    const head = content.substring(0, maxChars).trim();
    return content.length > maxChars ? head + '...' : head;
  }

  positions.sort((a, b) => a - b);
  let bestStart = positions[0]!;
  let bestCount = 0;
  let left = 0;
  for (let right = 0; right < positions.length; right++) {
    while (positions[right]! - positions[left]! > maxChars) left++;
    const count = right - left + 1;
    if (count > bestCount) {
      bestCount = count;
      bestStart = positions[left]!;
    }
  }

  const start = Math.max(0, bestStart - 120);
  const end = Math.min(content.length, start + maxChars);
  const absoluteStart = snapStart(lower, start, content);
  const absoluteEnd = snapEnd(lower, end, content);
  let excerpt = content.substring(absoluteStart, absoluteEnd).trim();

  if (absoluteStart > 0) excerpt = '...' + excerpt;
  if (absoluteEnd < content.length) excerpt = excerpt + '...';

  return excerpt;
}

// Snap a window edge to a nearby sentence boundary so excerpts read cleanly
// instead of starting/ending mid-sentence.
function snapStart(lower: string, start: number, content: string): number {
  const lookback = Math.min(start, 200);
  const window = lower.substring(start - lookback, start);
  const idx = window.lastIndexOf('. ');
  if (idx === -1) return start;
  const candidate = start - lookback + idx + 2;
  return lower.substring(candidate).startsWith(' the ') ? candidate : start;
}

function snapEnd(lower: string, end: number, content: string): number {
  const lookahead = Math.min(lower.length - end, 200);
  const window = lower.substring(end, end + lookahead);
  const idx = window.indexOf('. ');
  if (idx === -1) return end;
  return end + idx + 1;
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
