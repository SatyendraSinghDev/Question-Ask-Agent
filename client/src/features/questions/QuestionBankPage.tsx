import { useState } from 'react';
import { useListQuestionsQuery, useListSubjectsQuery, useReviewQuestionMutation } from './questionsApi';
import { Button, Card, DifficultyBadge, EmptyState, QuestionStatusBadge, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { getApiError } from '../../lib/axios';
import { Difficulty, type Question } from '../../types';

const DIFFICULTIES = ['', ...Object.values(Difficulty)];

export default function QuestionBankPage() {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const { data: subjects } = useListSubjectsQuery();
  const { data, isLoading, isFetching } = useListQuestionsQuery({ search, difficulty, subject: subjectId, limit: 24 });
  const [review] = useReviewQuestionMutation();
  const toast = useToast();

  const onReview = async (id: string, action: 'approve' | 'reject') => {
    try {
      await review({ id, action }).unwrap();
      toast.push(`Question ${action}d`, 'success');
    } catch (err) {
      toast.push(getApiError(err), 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Question bank</h1>
        <p className="text-sm text-slate-500">Browse, filter, and review questions — including AI-generated ones.</p>
      </div>

      <Card className="flex flex-wrap items-end gap-3">
        <label className="block flex-1 min-w-[200px]">
          <span className="label">Search</span>
          <input className="input" placeholder="Search question text or tags…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="block min-w-[180px]">
          <span className="label">Subject</span>
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">All subjects</option>
            {subjects?.items.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="block min-w-[150px]">
          <span className="label">Difficulty</span>
          <select className="input capitalize" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d || 'All'}</option>
            ))}
          </select>
        </label>
      </Card>

      {isLoading ? (
        <div className="grid place-items-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-3">
          {isFetching && <p className="text-xs text-slate-400">Updating…</p>}
          {data.items.map((q) => (
            <QuestionRow key={q._id} question={q} onReview={onReview} />
          ))}
        </div>
      ) : (
        <EmptyState title="No questions found" hint="Adjust filters or use the AI Generate tab to create some." />
      )}
    </div>
  );
}

function QuestionRow({ question, onReview }: { question: Question; onReview: (id: string, action: 'approve' | 'reject') => void }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {question.code && <span className="font-mono text-xs text-slate-400">{question.code}</span>}
            {question.source?.type === 'ai' && <span className="badge bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">🤖 AI</span>}
            <DifficultyBadge difficulty={question.difficulty} />
            <QuestionStatusBadge status={question.status} />
            <span className="badge bg-slate-100 capitalize dark:bg-slate-800">{question.type.replace(/_/g, ' ')}</span>
          </div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{question.text}</p>
          {question.textHindi && <p className="mt-1 font-deva text-sm text-slate-500">{question.textHindi}</p>}
        </div>
        <div className="shrink-0 text-right text-xs text-slate-400">
          <div>+{question.marks}</div>
          {question.negativeMarks ? <div>−{question.negativeMarks}</div> : null}
        </div>
      </div>

      {question.options && (
        <ul className="grid gap-1 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          {question.options.map((o) => {
            const isCorrect = Array.isArray(question.correctAnswer)
              ? question.correctAnswer.includes(o.key)
              : question.correctAnswer === o.key;
            return (
              <li key={o.key} className={isCorrect ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}>
                {o.key}. {o.text} {isCorrect && '✓'}
              </li>
            );
          })}
        </ul>
      )}

      {(question.status === 'pending_review' || question.status === 'draft') && (
        <div className="flex gap-2">
          <Button variant="secondary" className="text-xs" onClick={() => onReview(question._id, 'approve')}>Approve</Button>
          <Button variant="ghost" className="text-xs text-red-600" onClick={() => onReview(question._id, 'reject')}>Reject</Button>
        </div>
      )}
    </Card>
  );
}
