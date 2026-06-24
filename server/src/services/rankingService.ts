import { Result } from '../models/Result.js';
import type { Types } from 'mongoose';

/**
 * Compute leaderboard rank for a result within its test.
 * Higher percentage → lower rank number; ties broken by time (faster first).
 */
export async function computeRank(resultId: Types.ObjectId | string): Promise<{
  rank: number;
  totalParticipants: number;
}> {
  const result = await Result.findById(resultId).lean();
  if (!result) return { rank: 0, totalParticipants: 0 };

  const higher = await Result.countDocuments({
    test: result.test,
    $or: [
      { percentage: { $gt: result.percentage } },
      {
        percentage: result.percentage,
        timeTakenSeconds: { $lt: result.timeTakenSeconds ?? 0 },
      },
    ],
  });

  const total = await Result.countDocuments({ test: result.test });

  await Result.updateOne({ _id: resultId }, { $set: { rank: higher + 1, totalParticipants: total } });
  return { rank: higher + 1, totalParticipants: total };
}
