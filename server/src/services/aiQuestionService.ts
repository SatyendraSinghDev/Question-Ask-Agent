import { createHash } from 'node:crypto';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { Types } from 'mongoose';
import { aiService } from './aiService.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/apiError.js';
import {
  Difficulty,
  GenerationStatus,
  Language,
  MediaType,
  QuestionStatus,
  QuestionType,
} from '../types/enums.js';
import { AIQuestionGenerationLog } from '../models/AIQuestionGenerationLog.js';
import { Question } from '../models/Question.js';

// ─────────────────────────── Types ───────────────────────────

export interface GeneratedQuestionDTO {
  text: string;
  textHindi?: string;
  type: QuestionType;
  options?: { key: string; text: string; textHindi?: string }[];
  correctAnswer?: string | string[];
  numericalAnswer?: number;
  numericalTolerance?: number;
  acceptableAnswers?: string[];
  matchPairs?: { left: string; right: string; leftHindi?: string; rightHindi?: string }[];
  explanation?: string;
  explanationHindi?: string;
  difficulty: Difficulty;
  marks?: number;
}

export interface GenerationResult {
  logId: string;
  status: GenerationStatus;
  generated: GeneratedQuestionDTO[];
  savedIds: string[];
  savedCount: number;
}

// ─────────────────────────── Helpers ───────────────────────────

function diffWord(d: Difficulty): string {
  return { easy: 'easy (recall level)', medium: 'medium (application level)', hard: 'hard (analytical)' }[d];
}

function langInstruction(lang: Language): string {
  switch (lang) {
    case Language.HINDI:
      return 'Write the question, options, and explanation in Hindi (Devanagari). Leave English fields empty.';
    case Language.BILINGUAL:
      return 'Provide BOTH an English and a Hindi (Devanagari) version for every field.';
    default:
      return 'Write everything in English. Hindi fields may be empty.';
  }
}

function typeInstruction(type: QuestionType): string {
  switch (type) {
    case QuestionType.SINGLE_CHOICE:
      return 'single-correct MCQ with exactly 4 options (keys A,B,C,D); correctAnswer = single key.';
    case QuestionType.MULTIPLE_CHOICE:
      return 'multi-correct MCQ with 4 options; correctAnswer = array of keys.';
    case QuestionType.TRUE_FALSE:
      return 'true/false; options keys "true","false"; correctAnswer = single key.';
    case QuestionType.FILL_IN_THE_BLANK:
      return 'fill-in-the-blank; acceptableAnswers = array of valid strings.';
    case QuestionType.NUMERICAL:
      return 'numerical answer; numericalAnswer = number, numericalTolerance = 0 unless range.';
    case QuestionType.ASSERTION_REASON:
      return 'assertion-reason with passage; options A..D are the standard AR codes.';
    default:
      return 'single-correct MCQ with 4 options; correctAnswer = single key.';
  }
}

const SYSTEM_PROMPT = `You are TestASK AI, an expert examination author for Indian competitive exams
(GATE, UPSC, SSC, Banking, CAT, NEET, JEE). You produce original, syllabus-accurate,
unambiguous questions. Always return STRICT JSON matching the requested schema.
Never duplicate well-known textbook questions verbatim — rephrase meaningfully.`;

function buildUserPrompt(args: {
  topic: string;
  count: number;
  difficulty: Difficulty;
  language: Language;
  type: QuestionType;
  context?: string;
}): string {
  return `Generate ${args.count} ${diffWord(args.difficulty)} ${args.type.replace(/_/g, ' ')} questions on the topic:
"${args.topic}".

Question shape: ${typeInstruction(args.type)}
Language: ${langInstruction(args.language)}

${args.context ? `Use this source content as the basis (rephrase, do not copy verbatim):\n"""\n${args.context}\n"""` : ''}

Return JSON of the form:
{
  "questions": [
    {
      "text": "...",
      "textHindi": "...",                       // optional
      "type": "${args.type}",
      "options": [{"key":"A","text":"...","textHindi":"..."}, ...],
      "correctAnswer": "A",                      // or array / omitted per type
      "numericalAnswer": 0,                      // only for numerical
      "acceptableAnswers": [],                   // only for fill_in_the_blank
      "explanation": "...",
      "explanationHindi": "...",
      "difficulty": "${args.difficulty}",
      "marks": 1
    }
  ]
}`;
}

function toPublicUrl(filename: string): string {
  return `${env.appUrl}/uploads/${path.basename(filename)}`;
}

async function readImageAsDataUrl(filepath: string): Promise<string> {
  const buf = await fs.readFile(filepath);
  const ext = path.extname(filepath).slice(1) || 'png';
  return `data:image/${ext};base64,${buf.toString('base64')}`;
}

async function extractPdfText(filepath: string): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const buf = await fs.readFile(filepath);
    const data = await pdfParse(buf);
    return (data.text ?? '').slice(0, 12000);
  } catch (err) {
    logger.warn({ err }, 'pdf-parse failed; falling back to no-context generation');
    return '';
  }
}

function originalityHash(q: GeneratedQuestionDTO): string {
  const core = (q.text + '|' + (q.options?.map((o) => o.text).join('|') ?? '')).toLowerCase().trim();
  return createHash('sha1').update(core).digest('hex').slice(0, 16);
}

// ─────────────────────────── Persistence ───────────────────────────

async function persistGenerated(
  generated: GeneratedQuestionDTO[],
  ctx: {
    subject?: Types.ObjectId | string;
    requestedBy: Types.ObjectId | string;
    logId: Types.ObjectId | string;
    language: Language;
  },
): Promise<string[]> {
  const ids: string[] = [];
  for (const q of generated) {
    const doc = await Question.create({
      subject: ctx.subject,
      type: q.type,
      difficulty: q.difficulty,
      language: ctx.language,
      text: q.text,
      textHindi: q.textHindi,
      options: q.options,
      correctAnswer: q.correctAnswer,
      acceptableAnswers: q.acceptableAnswers,
      numericalAnswer: q.numericalAnswer,
      numericalTolerance: q.numericalTolerance,
      matchPairs: q.matchPairs,
      explanation: q.explanation,
      explanationHindi: q.explanationHindi,
      marks: q.marks ?? 1,
      status: QuestionStatus.PENDING_REVIEW,
      source: {
        type: 'ai',
        generationLog: ctx.logId,
        originalityHash: originalityHash(q),
      },
      createdBy: ctx.requestedBy,
    });
    ids.push(String(doc._id));
  }
  return ids;
}

// ─────────────────────────── Public API ───────────────────────────

async function generateFromText(args: {
  requestedBy: Types.ObjectId | string;
  topic: string;
  subject?: Types.ObjectId | string;
  count: number;
  difficulty: Difficulty;
  language: Language;
  type: QuestionType;
  autoSave: boolean;
}): Promise<GenerationResult> {
  const log = await AIQuestionGenerationLog.create({
    requestedBy: args.requestedBy,
    inputType: MediaType.TEXT,
    topic: args.topic,
    subject: args.subject,
    difficulty: args.difficulty,
    language: args.language,
    count: args.count,
    status: GenerationStatus.PROCESSING,
    prompt: buildUserPrompt({ ...args, count: args.count, type: args.type }),
    model: aiService.model,
  });

  try {
    const { data, usage } = await aiService.chatJSON<{ questions: GeneratedQuestionDTO[] }>({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(args),
    });

    const questions = (data.questions ?? []).filter((q) => q.text);
    const savedIds =
      args.autoSave && args.subject
        ? await persistGenerated(questions, {
            subject: args.subject,
            requestedBy: args.requestedBy,
            logId: log._id,
            language: args.language,
          })
        : [];

    log.set({
      status: GenerationStatus.COMPLETED,
      generatedQuestions: questions.map((q) => ({ raw: q })),
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
      savedCount: savedIds.length,
    });
    await log.save();

    return { logId: String(log._id), status: GenerationStatus.COMPLETED, generated: questions, savedIds, savedCount: savedIds.length };
  } catch (err) {
    log.set({ status: GenerationStatus.FAILED, error: (err as Error).message });
    await log.save();
    throw err;
  }
}

async function generateFromImage(args: {
  requestedBy: Types.ObjectId | string;
  filepath: string;
  filename: string;
  subject?: Types.ObjectId | string;
  topic?: string;
  count: number;
  difficulty: Difficulty;
  language: Language;
  autoSave: boolean;
}): Promise<GenerationResult> {
  const dataUrl = await readImageAsDataUrl(args.filepath);
  const topic = args.topic ?? 'the content depicted in the provided image';

  const log = await AIQuestionGenerationLog.create({
    requestedBy: args.requestedBy,
    inputType: MediaType.IMAGE,
    subject: args.subject,
    topic,
    difficulty: args.difficulty,
    language: args.language,
    count: args.count,
    fileUrl: toPublicUrl(args.filename),
    status: GenerationStatus.PROCESSING,
    model: aiService.model,
  });

  try {
    const { data, usage } = await aiService.chatJSON<{ questions: GeneratedQuestionDTO[] }>({
      system: SYSTEM_PROMPT + '\nFirst OCR/read the image, understand the concepts, then generate questions.',
      user: buildUserPrompt({ topic, count: args.count, difficulty: args.difficulty, language: args.language, type: QuestionType.SINGLE_CHOICE }),
      imageUrls: [dataUrl],
    });

    const questions = (data.questions ?? []).filter((q) => q.text);
    const savedIds =
      args.autoSave && args.subject
        ? await persistGenerated(questions, {
            subject: args.subject,
            requestedBy: args.requestedBy,
            logId: log._id,
            language: args.language,
          })
        : [];

    log.set({
      status: GenerationStatus.COMPLETED,
      generatedQuestions: questions.map((q) => ({ raw: q })),
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
      savedCount: savedIds.length,
    });
    await log.save();

    return { logId: String(log._id), status: GenerationStatus.COMPLETED, generated: questions, savedIds, savedCount: savedIds.length };
  } catch (err) {
    log.set({ status: GenerationStatus.FAILED, error: (err as Error).message });
    await log.save();
    throw err;
  }
}

async function generateFromPdf(args: {
  requestedBy: Types.ObjectId | string;
  filepath: string;
  filename: string;
  subject?: Types.ObjectId | string;
  topic?: string;
  count: number;
  difficulty: Difficulty;
  language: Language;
  autoSave: boolean;
}): Promise<GenerationResult> {
  const extractedText = await extractPdfText(args.filepath);
  if (!extractedText.trim()) {
    throw ApiError.unprocessable('Could not extract any text from the PDF');
  }
  const topic = args.topic ?? 'the content of the uploaded PDF';

  const log = await AIQuestionGenerationLog.create({
    requestedBy: args.requestedBy,
    inputType: MediaType.PDF,
    subject: args.subject,
    topic,
    difficulty: args.difficulty,
    language: args.language,
    count: args.count,
    fileUrl: toPublicUrl(args.filename),
    extractedText: extractedText.slice(0, 4000),
    status: GenerationStatus.PROCESSING,
    model: aiService.model,
  });

  try {
    const { data, usage } = await aiService.chatJSON<{ questions: GeneratedQuestionDTO[] }>({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt({
        topic,
        count: args.count,
        difficulty: args.difficulty,
        language: args.language,
        type: QuestionType.SINGLE_CHOICE,
        context: extractedText.slice(0, 8000),
      }),
    });

    const questions = (data.questions ?? []).filter((q) => q.text);
    const savedIds =
      args.autoSave && args.subject
        ? await persistGenerated(questions, {
            subject: args.subject,
            requestedBy: args.requestedBy,
            logId: log._id,
            language: args.language,
          })
        : [];

    log.set({
      status: GenerationStatus.COMPLETED,
      generatedQuestions: questions.map((q) => ({ raw: q })),
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
      savedCount: savedIds.length,
    });
    await log.save();

    return { logId: String(log._id), status: GenerationStatus.COMPLETED, generated: questions, savedIds, savedCount: savedIds.length };
  } catch (err) {
    log.set({ status: GenerationStatus.FAILED, error: (err as Error).message });
    await log.save();
    throw err;
  }
}

/** Detect near-duplicates by originality hash within a subject. */
export async function findDuplicate(text: string, options: string[], subject?: string): Promise<string | null> {
  const core = (text + '|' + (options?.join('|') ?? '')).toLowerCase().trim();
  const hash = createHash('sha1').update(core).digest('hex').slice(0, 16);
  const dup = await Question.findOne({ 'source.originalityHash': hash, subject: subject ?? { $exists: true } })
    .select('_id code')
    .lean();
  return dup ? String(dup._id) : null;
}

export async function translateQuestion(questionId: Types.ObjectId | string, to: Language): Promise<{ text: string }> {
  const q = await Question.findById(questionId).lean();
  if (!q) throw ApiError.notFound('Question not found');
  const field = to === Language.HINDI ? 'textHindi' : 'text';
  const source = to === Language.HINDI ? q.text : q.textHindi ?? q.text;
  if (!source) throw ApiError.badRequest('Nothing to translate');

  const { data } = await aiService.chatJSON<{ translated: string }>({
    system: 'You translate exam questions accurately between English and Hindi (Devanagari), preserving meaning and tone.',
    user: `Translate to ${to === Language.HINDI ? 'Hindi' : 'English'}:\n"""${source}"""\nReturn {"translated": "..."}`,
  });
  await Question.updateOne({ _id: questionId }, { $set: { [field]: data.translated } });
  return { text: data.translated };
}

export async function evaluateSubjective(args: {
  questionId: Types.ObjectId | string;
  studentAnswer: string;
  maxMarks: number;
}): Promise<{ awardedMarks: number; feedback: string; rubric: { criterion: string; score: number }[] }> {
  const q = await Question.findById(args.questionId).lean();
  if (!q) throw ApiError.notFound('Question not found');
  const modelAnswer = q.explanation ?? q.text;

  const { data } = await aiService.chatJSON<{
    awardedMarks: number;
    feedback: string;
    rubric: { criterion: string; score: number }[];
  }>({
    system:
      'You are a strict but fair examiner. Grade the student answer against the model answer using a rubric. Be conservative with marks.',
    user: `Question: ${q.text}\nModel answer: ${modelAnswer}\nStudent answer: ${args.studentAnswer}\nMax marks: ${args.maxMarks}\nReturn {"awardedMarks": number, "feedback": string, "rubric": [{criterion, score}]}.`,
  });

  return {
    awardedMarks: Math.max(0, Math.min(args.maxMarks, Math.round(data.awardedMarks * 10) / 10)),
    feedback: data.feedback,
    rubric: data.rubric ?? [],
  };
}

export async function smartRecommend(subject: Types.ObjectId | string, count = 10): Promise<string[]> {
  // Recommend questions the student has historically struggled with (heuristic: hardest unanswered).
  const recs = await Question.aggregate([
    { $match: { subject: subject, status: QuestionStatus.APPROVED } },
    { $sort: { difficulty: -1, marks: -1 } },
    { $limit: count },
    { $project: { _id: 1 } },
  ]);
  return recs.map((r) => String(r._id));
}

export const aiQuestionService = {
  generateFromText,
  generateFromImage,
  generateFromPdf,
  translateQuestion,
  evaluateSubjective,
  smartRecommend,
  findDuplicate,
};
