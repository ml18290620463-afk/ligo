import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DiaryEntry } from '../types';
import { getMorningStarAnalysis as defaultMorningStarFetcher } from '../services/geminiService';

export type ReadingStep = 'reading' | 'reflecting' | 'evaluation';

export interface ParsedMorningStarAnalysis {
  content: string;
  metrics: Record<string, number>;
}

/** Signature compatible with `services/geminiService.getMorningStarAnalysis`. */
export type MorningStarFetcher = (
  decryptedContent: string,
  reflectionText: string,
  personas: string[],
) => Promise<string>;

export interface UseMorningStarPipelineArgs {
  entry: DiaryEntry;
  guidingStars: string[];
  /** Plaintext (post-decryption) entry body. Falls back to `entry.content`. */
  decryptedContent: string;
  language: 'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'es' | 'de';
  /** Persist updates back to useDiaryData. */
  onUpdateEntry: (updated: DiaryEntry) => void;
  /**
   * Override the upstream Morning Star call; defaults to the proxy in
   * `services/geminiService`. Useful for tests and for swapping providers
   * (e.g. SSE) without touching this hook.
   */
  fetcher?: MorningStarFetcher;
}

export interface MorningStarPipeline {
  personas: string[];
  setPersonas: (personas: string[]) => void;
  reflectionText: string;
  setReflectionText: (text: string) => void;
  loading: boolean;
  error: string | null;
  parsedAnalysis: ParsedMorningStarAnalysis | null;
  readingStep: ReadingStep;
  setReadingStep: (step: ReadingStep) => void;
  /** Trigger an analysis call. No-ops if already loading or pre-conditions fail. */
  analyze: () => Promise<void>;
  /** Drop the persisted analysis and reset to the reading step. */
  deleteAnalysis: () => void;
}

const initialPersonas = (entry: DiaryEntry, guidingStars: string[]): string[] => {
  if (entry.morningStarPersonas && entry.morningStarPersonas.length > 0) {
    return entry.morningStarPersonas;
  }
  if (guidingStars.length > 0) return guidingStars;
  return ['Marcus Aurelius'];
};

const initialReadingStep = (entry: DiaryEntry): ReadingStep =>
  entry.morningStarAnalysis ? 'evaluation' : 'reading';

const safeParseAnalysis = (raw: string | undefined): ParsedMorningStarAnalysis | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'content' in parsed && 'metrics' in parsed) {
      return parsed as ParsedMorningStarAnalysis;
    }
    return { content: raw, metrics: {} };
  } catch {
    return { content: raw, metrics: {} };
  }
};

/**
 * Owns the entire Morning Star sub-flow: persona selection, the
 * `reading → reflecting → evaluation` step machine, the loading /
 * error state, the upstream call, and the JSON parse of the persisted
 * analysis. Extracted from `Viewer.tsx` so the viewer's job shrinks to
 * "wire the pipeline into the panel".
 */
export const useMorningStarPipeline = ({
  entry,
  guidingStars,
  decryptedContent,
  language,
  onUpdateEntry,
  fetcher = defaultMorningStarFetcher,
}: UseMorningStarPipelineArgs): MorningStarPipeline => {
  const [personas, setPersonas] = useState<string[]>(() => initialPersonas(entry, guidingStars));
  const [reflectionText, setReflectionText] = useState(entry.reflection ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readingStep, setReadingStep] = useState<ReadingStep>(() => initialReadingStep(entry));

  // Reset when navigating into a different entry.
  // We deliberately depend on the specific entry fields below — depending on
  // `entry` itself would re-fire on unrelated mutations (e.g. attachment
  // resize) and clobber in-progress reflection text. `guidingStars` is
  // joined into a string so we compare *content*, not reference; otherwise
  // a new array per render (the common React parent-passes-literal pattern)
  // would loop the effect.
  const guidingStarsKey = guidingStars.join('|');
  useEffect(() => {
    setPersonas(initialPersonas(entry, guidingStars));
    setReflectionText(entry.reflection ?? '');
    setReadingStep(initialReadingStep(entry));
    setLoading(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    entry.id,
    entry.morningStarAnalysis,
    entry.morningStarPersonas,
    entry.reflection,
    guidingStarsKey,
  ]);

  // Auto-clear the error banner only when the user *changes* the
  // reflection (acknowledging the previous failure). We track the
  // previous value via a ref so the effect doesn't fire on the
  // initial mount with a pre-populated reflection.
  const prevReflectionRef = useRef(reflectionText);
  useEffect(() => {
    if (prevReflectionRef.current !== reflectionText) {
      prevReflectionRef.current = reflectionText;
      if (error && reflectionText.trim()) setError(null);
    }
  }, [error, reflectionText]);

  const parsedAnalysis = useMemo(
    () => safeParseAnalysis(entry.morningStarAnalysis),
    [entry.morningStarAnalysis],
  );

  const analyze = useCallback(async () => {
    if (loading || !reflectionText.trim() || personas.length === 0) return;
    setLoading(true);
    setError(null);
    setReadingStep('evaluation');
    try {
      const contentToAnalyze = decryptedContent || entry.content;
      const result = await fetcher(contentToAnalyze, reflectionText, personas);
      onUpdateEntry({
        ...entry,
        morningStarAnalysis: result,
        morningStarPersonas: personas,
        reflection: reflectionText,
      });
    } catch (err) {
      console.error('Morning Star Analysis failed:', err);
      setError(
        language === 'zh'
          ? '启明星连接暂时不稳定，请稍后再试。'
          : 'Morning Star is temporarily unavailable. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [
    decryptedContent,
    entry,
    fetcher,
    language,
    loading,
    onUpdateEntry,
    personas,
    reflectionText,
  ]);

  const deleteAnalysis = useCallback(() => {
    onUpdateEntry({
      ...entry,
      morningStarAnalysis: undefined,
      morningStarPersonas: undefined,
      reflection: '',
    });
    setReadingStep('reading');
    setReflectionText('');
    setError(null);
  }, [entry, onUpdateEntry]);

  return {
    personas,
    setPersonas,
    reflectionText,
    setReflectionText,
    loading,
    error,
    parsedAnalysis,
    readingStep,
    setReadingStep,
    analyze,
    deleteAnalysis,
  };
};
