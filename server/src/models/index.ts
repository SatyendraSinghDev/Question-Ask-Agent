/**
 * Central model registry. Importing this file guarantees every schema is
 * registered with Mongoose (important for indexes + cross-refs).
 */
export { User } from './User.js';
export { Subject } from './Subject.js';
export { Topic } from './Topic.js';
export { Question } from './Question.js';
export { Test } from './Test.js';
export { TestAttempt } from './TestAttempt.js';
export { Result } from './Result.js';
export { Certificate } from './Certificate.js';
export { AIQuestionGenerationLog } from './AIQuestionGenerationLog.js';
export { Counter } from './Counter.js';
