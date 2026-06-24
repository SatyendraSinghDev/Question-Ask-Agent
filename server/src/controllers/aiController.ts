import type { Response } from 'express';
import path from 'node:path';
import type { AuthedRequest } from '../types/index.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../middleware/error.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { aiService } from '../services/aiService.js';
import { aiQuestionService } from '../services/aiQuestionService.js';
import { Difficulty, Language, QuestionType } from '../types/enums.js';

export const generateFromText = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!aiService.enabled) {
    throw ApiError.serviceUnavailable('AI features are disabled (OPENAI_API_KEY not set)', 'AI_DISABLED');
  }
  const body = req.body as {
    topic: string;
    subject?: string;
    count: number;
    difficulty: 'easy' | 'medium' | 'hard';
    language: 'english' | 'hindi' | 'bilingual';
    type: 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_in_the_blank' | 'numerical' | 'assertion_reason';
    autoSave: boolean;
  };
  const result = await aiQuestionService.generateFromText({
    requestedBy: req.principal!.userId,
    topic: body.topic,
    subject: body.subject,
    count: body.count,
    difficulty: body.difficulty as Difficulty,
    language: body.language as Language,
    type: body.type as QuestionType,
    autoSave: body.autoSave,
  });
  return sendSuccess({ res, status: 201, data: result });
});

export const generateFromImage = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!aiService.enabled) {
    throw ApiError.serviceUnavailable('AI features are disabled', 'AI_DISABLED');
  }
  const file = req.file;
  if (!file) throw ApiError.badRequest('Image file is required');
  const body = req.body as {
    subject?: string;
    topic?: string;
    count?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    language?: 'english' | 'hindi' | 'bilingual';
    autoSave?: string;
  };
  const result = await aiQuestionService.generateFromImage({
    requestedBy: req.principal!.userId,
    filepath: file.path,
    filename: path.basename(file.path),
    subject: body.subject,
    topic: body.topic,
    count: Number(body.count ?? 5),
    difficulty: (body.difficulty ?? 'medium') as Difficulty,
    language: (body.language ?? 'english') as Language,
    autoSave: body.autoSave !== 'false',
  });
  return sendSuccess({ res, status: 201, data: result });
});

export const generateFromPdf = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!aiService.enabled) {
    throw ApiError.serviceUnavailable('AI features are disabled', 'AI_DISABLED');
  }
  const file = req.file;
  if (!file) throw ApiError.badRequest('PDF file is required');
  const body = req.body as {
    subject?: string;
    topic?: string;
    count?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    language?: 'english' | 'hindi' | 'bilingual';
    autoSave?: string;
  };
  const result = await aiQuestionService.generateFromPdf({
    requestedBy: req.principal!.userId,
    filepath: file.path,
    filename: path.basename(file.path),
    subject: body.subject,
    topic: body.topic,
    count: Number(body.count ?? 5),
    difficulty: (body.difficulty ?? 'medium') as Difficulty,
    language: (body.language ?? 'english') as Language,
    autoSave: body.autoSave !== 'false',
  });
  return sendSuccess({ res, status: 201, data: result });
});

export const translateQuestion = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { questionId, to } = req.body as { questionId: string; to: 'english' | 'hindi' };
  const text = await aiQuestionService.translateQuestion(questionId, to as Language);
  return sendSuccess({ res, data: text });
});

export const evaluateSubjective = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { questionId, studentAnswer, maxMarks } = req.body as {
    questionId: string;
    studentAnswer: string;
    maxMarks: number;
  };
  const data = await aiQuestionService.evaluateSubjective({ questionId, studentAnswer, maxMarks });
  return sendSuccess({ res, data });
});

export const aiHealth = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  return sendSuccess({
    res,
    data: { enabled: aiService.enabled, provider: aiService.provider, model: aiService.model },
  });
});
