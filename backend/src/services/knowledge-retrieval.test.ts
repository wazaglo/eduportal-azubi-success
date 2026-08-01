import { describe, expect, it } from 'vitest';
import {
  detectSubject,
  tokenize,
  calculateRelevance,
  findBoilerplateRanges,
  inBoilerplate,
  extractRelevantExcerpt,
  MIN_CONFIDENT_SCORE,
  MIN_WEAK_SCORE,
  SINGLE_TERM_MIN_COUNT,
} from './knowledge-retrieval';

describe('tokenize', () => {
  it('keeps meaningful terms and drops stopwords', () => {
    expect(tokenize('What is a quadratic equation?')).toEqual(['quadratic', 'equation']);
  });

  it('drops short tokens and stopword-only input', () => {
    expect(tokenize('Define the ecosystem')).toEqual(['ecosystem']);
    expect(tokenize('is a to the')).toEqual([]);
  });

  it('is case insensitive', () => {
    expect(tokenize('PHOTOSYNTHESIS in SCIENCE')).toEqual(['photosynthesis', 'science']);
  });
});

describe('detectSubject', () => {
  it('matches an exact subject name in the question', () => {
    expect(detectSubject('What is photosynthesis in Integrated Science?')).toBe('Integrated Science');
    expect(detectSubject('Core Mathematics past paper')).toBe('Core Mathematics');
  });

  it('is case insensitive on subject names', () => {
    expect(detectSubject('INTEGRATED SCIENCE revision')).toBe('Integrated Science');
  });

  it('maps common aliases', () => {
    expect(detectSubject('help with maths homework')).toBe('Core Mathematics');
    expect(detectSubject('solve this math problem')).toBe('Core Mathematics');
    expect(detectSubject('general science question')).toBe('Integrated Science');
    expect(detectSubject('english essay help')).toBe('English Language');
    expect(detectSubject('social studies exam')).toBe('Social Studies');
  });

  it('detects subject-topic keywords', () => {
    expect(detectSubject('What is a quadratic equation?')).toBe('Core Mathematics');
    expect(detectSubject('Describe the cell and organism')).toBe('Integrated Science');
    expect(detectSubject('Explain citizenship and governance')).toBe('Social Studies');
    expect(detectSubject('Fix my grammar and tense')).toBe('English Language');
  });

  it('returns null when no subject is identifiable', () => {
    expect(detectSubject('What is the weather today?')).toBeNull();
  });

  it('only ever returns one of the four subjects', () => {
    const questions = [
      'What is algebra?',
      'What is a noun?',
      'Explain photosynthesis',
      'What is democracy?',
      'what is the cell wall',
      'solve the ratio and percentage',
      'write an essay about comprehension',
    ];
    const subjects = new Set(['Core Mathematics', 'English Language', 'Integrated Science', 'Social Studies']);
    for (const q of questions) {
      const subject = detectSubject(q);
      if (subject !== null) {
        expect(subjects.has(subject)).toBe(true);
      }
    }
  });
});

describe('calculateRelevance', () => {
  it('gives a title bonus when a term appears in the title', () => {
    const base = calculateRelevance(['quadratic'], 'no terms here', 'quadratic appears in body');
    const withTitle = calculateRelevance(['quadratic'], 'Quadratic Functions', 'quadratic appears in body');
    expect(withTitle.score).toBeGreaterThan(base.score);
  });

  it('counts distinct matched terms and max single-term frequency', () => {
    const content = 'ecosystem food chain. ecosystem balance. ecosystem study. ecosystem impact.';
    const result = calculateRelevance(['ecosystem', 'chain'], 'some title', content);
    expect(result.distinctMatched).toBe(2);
    expect(result.maxTermCount).toBeGreaterThanOrEqual(4);
  });

  it('supports the strong single-term exception', () => {
    const content = `${'photosynthesis '.repeat(10)}plants make food`;
    const result = calculateRelevance(['photosynthesis', 'integrated', 'science'], 'title', content);
    expect(result.distinctMatched).toBe(1);
    expect(result.maxTermCount).toBeGreaterThanOrEqual(SINGLE_TERM_MIN_COUNT);
  });

  it('ignores matches inside NaCCA guidance blocks', () => {
    const content = 'maths content. National Core Values: quadratic quadratic quadratic quadratic quadratic quadratic.';
    const result = calculateRelevance(['quadratic'], 'title', content);
    expect(result.distinctMatched).toBe(0);
    expect(result.maxTermCount).toBe(0);
  });
});

describe('boilerplate ranges', () => {
  it('marks ranges from a guidance marker onwards', () => {
    const content = 'start. National Core Values: some guidance text. more content';
    const ranges = findBoilerplateRanges(content);
    expect(ranges.length).toBeGreaterThan(0);
    const [start, end] = ranges[0]!;
    expect(start).toBe(content.indexOf('National Core Values'));
    expect(end).toBeGreaterThan(start);
  });

  it('inBoilerplate reports positions inside a flagged block', () => {
    const content = 'before. Core Competencies: guidance here';
    const ranges = findBoilerplateRanges(content);
    expect(inBoilerplate(ranges, content.indexOf('guidance'))).toBe(true);
    expect(inBoilerplate(ranges, content.indexOf('before'))).toBe(false);
  });
});

describe('extractRelevantExcerpt', () => {
  it('prefers a dense window of real matches over curriculum guidance blocks', () => {
    const real =
      'quadratic equation and quadratic formula and quadratic graph and quadratic roots. ' +
      'quadratic equation and quadratic formula and quadratic graph and quadratic roots. ';
    const filler = 'filler '.repeat(250);
    const boilerplate = ' National Core Values: ' + 'quadratic '.repeat(40) + ' diversity equity integrity.';
    const content = real + filler + boilerplate;

    const excerpt = extractRelevantExcerpt(content, ['quadratic', 'equation'], 1000);
    expect(excerpt).toContain('quadratic');
    expect(excerpt).not.toContain('National Core Values');
  });

  it('returns the head of content when there are no matches', () => {
    const content = 'hello world';
    expect(extractRelevantExcerpt(content, ['quadratic'], 1000)).toBe('hello world');
  });

  it('snaps the excerpt window to sentence boundaries', () => {
    const before = 'An unrelated introductory paragraph about science. '.repeat(3);
    const target =
      'Gradient is the steepness of a line. The gradient of y = mx + c is m. ' +
      'Compute the equation of a line through two points using the gradient.';
    const after = 'Following unrelated content continues here. '.repeat(20);
    const content = before + target + after;

    const excerpt = extractRelevantExcerpt(content, ['gradient', 'line'], 700);
    expect(excerpt.startsWith('...')).toBe(true);
    expect(excerpt).toContain('The gradient of y = mx + c is m.');
    expect(excerpt.endsWith('...')).toBe(true);
  });
});

describe('thresholds', () => {
  it('exposes confident and weak match thresholds', () => {
    expect(MIN_CONFIDENT_SCORE).toBeGreaterThan(MIN_WEAK_SCORE);
    expect(MIN_CONFIDENT_SCORE).toBe(15);
    expect(MIN_WEAK_SCORE).toBe(3);
  });
});
