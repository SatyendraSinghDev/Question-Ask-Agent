import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { Logo } from '../../components/Logo';
import { Button, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { getApiError } from '../../lib/axios';
import {
  useLogProctorMutation,
  useSaveAnswerMutation,
  useStartAttemptMutation,
  useSubmitAttemptMutation,
} from './testRunnerApi';
import type { AttemptAnswer, Question, Test } from '../../types';

interface RunnerQuestion extends Question {
  _id: string;
}

export default function TestRunnerPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [startAttempt, { isLoading: starting }] = useStartAttemptMutation();
  const [saveAnswer] = useSaveAnswerMutation();
  const [submitAttempt, { isLoading: submitting }] = useSubmitAttemptMutation();
  const [logProctor] = useLogProctorMutation();

  const [test, setTest] = useState<RunnerQuestion[] | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ name: string; durationSeconds?: number; proctoring?: Test['proctoring'] } | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AttemptAnswer>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const proctorEventsRef = useRef<Array<{ type: string; meta?: unknown }>>([]);

  // ── Start the attempt on mount ──
  useEffect(() => {
    if (!testId) return;
    startAttempt(testId)
      .unwrap()
      .then((res) => {
        const qs = (res.test.questions as RunnerQuestion[]).filter(Boolean);
        setTest(qs);
        setAttemptId(res.attempt._id);
        setMeta({
          name: res.test.name,
          durationSeconds: res.test.durationSeconds,
          proctoring: res.test.proctoring,
        });
        if (res.test.durationSeconds) {
          const startedAt = new Date(res.attempt.startedAt).getTime();
          const endsAt = res.attempt.expiresAt ? new Date(res.attempt.expiresAt).getTime() : startedAt + res.test.durationSeconds * 1000;
          setSecondsLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
        }
        if (res.resumed) toast.push('Resumed your previous attempt', 'info');
      })
      .catch((err) => {
        toast.push(getApiError(err), 'error');
        navigate('/app/tests');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  // ── Countdown timer + auto-submit ──
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      handleSubmit(true);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s ?? 0) - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  // ── Anti-cheat: tab switch + fullscreen exit detection ──
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        proctorEventsRef.current.push({ type: 'tab_switch', meta: { at: new Date().toISOString() } });
        if (attemptId) logProctor({ attemptId, type: 'tab_switch' });
        toast.push('⚠️ Tab switching is recorded.', 'error');
      }
    };
    const onBlur = () => proctorEventsRef.current.push({ type: 'window_blur' });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [attemptId, logProctor, toast]);

  const questions = test ?? [];
  const q = questions[current];
  const answeredCount = Object.values(answers).filter((a) => a.value !== undefined && a.value !== '' && a.value !== null).length;
  const reviewCount = Object.values(answers).filter((a) => a.markedForReview).length;
  const notAnswered = questions.length - answeredCount;

  const setAnswer = useCallback(
    (value: unknown, markedForReview?: boolean) => {
      if (!q || !attemptId) return;
      const next: AttemptAnswer = {
        questionId: q._id,
        value,
        status: value ? 'answered' : 'not_answered',
        markedForReview: markedForReview ?? answers[q._id]?.markedForReview ?? false,
      };
      setAnswers((a) => ({ ...a, [q._id]: next }));
      saveAnswer({ attemptId, questionId: q._id, body: { value, markedForReview: next.markedForReview, status: next.status } }).catch(() => undefined);
    },
    [q, attemptId, answers, saveAnswer],
  );

  const toggleReview = useCallback(() => {
    if (!q || !attemptId) return;
    const cur = answers[q._id];
    const nextMark = !cur?.markedForReview;
    setAnswers((a) => ({
      ...a,
      [q._id]: { questionId: q._id, value: cur?.value, status: cur?.value ? 'answered_marked' : 'marked', markedForReview: nextMark },
    }));
    saveAnswer({ attemptId, questionId: q._id, body: { markedForReview: nextMark } }).catch(() => undefined);
  }, [q, attemptId, answers, saveAnswer]);

  const clearResponse = useCallback(() => {
    if (!q) return;
    setAnswer(undefined);
  }, [q, setAnswer]);

  const handleSubmit = useCallback(
    async (auto = false) => {
      if (!attemptId) return;
      try {
        const res = await submitAttempt({ attemptId, proctorEvents: proctorEventsRef.current }).unwrap();
        toast.push(auto ? '⏰ Time up — submitted automatically' : 'Test submitted!', 'success');
        navigate(`/app/results/${res.result._id}`);
      } catch (err) {
        toast.push(getApiError(err), 'error');
      }
    },
    [attemptId, submitAttempt, navigate, toast],
  );

  if (starting || !test) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950">
        <div className="text-center">
          <Spinner className="mx-auto h-8 w-8" />
          <p className="mt-3 text-sm text-slate-400">Preparing your test…</p>
        </div>
      </div>
    );
  }

  if (!q) {
    return <div className="grid min-h-screen place-items-center">No questions in this test.</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100 dark:bg-slate-950">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <Logo />
        <div className="flex items-center gap-3">
          {secondsLeft !== null && (
            <Timer secondsLeft={secondsLeft} onExpire={() => handleSubmit(true)} />
          )}
          <Button variant="secondary" onClick={() => setShowSubmitModal(true)} disabled={submitting}>
            Submit
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Question area */}
        <main className="flex flex-1 flex-col overflow-y-auto p-6">
          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="badge bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-300">
                Question {current + 1} of {questions.length}
              </span>
              <span className="text-sm font-medium text-slate-500">Marks: {q.marks ?? 1}{q.negativeMarks ? ` · −${q.negativeMarks} wrong` : ''}</span>
            </div>

            <QuestionView question={q} answer={answers[q._id]} onAnswer={setAnswer} />

            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={clearResponse}>Clear response</Button>
              <Button variant="ghost" onClick={toggleReview}>
                {answers[q._id]?.markedForReview ? '★ Marked for review' : 'Mark for review'}
              </Button>
              <div className="flex-1" />
              <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((c) => Math.max(0, c - 1))}>← Previous</Button>
              {current < questions.length - 1 ? (
                <Button onClick={() => setCurrent((c) => c + 1)}>Save &amp; Next →</Button>
              ) : (
                <Button onClick={() => setShowSubmitModal(true)}>Review &amp; Submit</Button>
              )}
            </div>
          </div>
        </main>

        {/* Navigator */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:block">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Question navigator</h3>
          <div className="mb-4 grid grid-cols-5 gap-2">
            {questions.map((qq, i) => {
              const a = answers[qq._id];
              const isAnswered = a?.value !== undefined && a.value !== '' && a.value !== null;
              const isMarked = a?.markedForReview;
              return (
                <button
                  key={qq._id}
                  onClick={() => setCurrent(i)}
                  className={clsx(
                    'h-9 rounded-md text-sm font-medium transition-colors',
                    i === current && 'ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-slate-900',
                    isMarked && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                    !isMarked && isAnswered && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                    !isMarked && !isAnswered && 'bg-slate-100 text-slate-500 dark:bg-slate-800',
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <dl className="space-y-1.5 text-xs text-slate-500">
            <div className="flex items-center justify-between"><dt className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-200" /> Answered</dt><dd>{answeredCount}</dd></div>
            <div className="flex items-center justify-between"><dt className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-slate-200" /> Not answered</dt><dd>{notAnswered}</dd></div>
            <div className="flex items-center justify-between"><dt className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-amber-200" /> Marked</dt><dd>{reviewCount}</dd></div>
          </dl>
          {meta?.proctoring?.tabSwitchDetection && (
            <p className="mt-4 rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
              🔒 Anti-cheat is on. Tab switches are logged.
            </p>
          )}
        </aside>
      </div>

      {/* Submit modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="card w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Submit test?</h3>
            <p className="mt-1 text-sm text-slate-500">
              You've answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
              {notAnswered > 0 && ` ${notAnswered} unanswered.`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>Keep going</Button>
              <Button loading={submitting} onClick={() => handleSubmit(false)}>Submit now</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Timer ──
function Timer({ secondsLeft, onExpire }: { secondsLeft: number; onExpire: () => void }) {
  useEffect(() => {
    if (secondsLeft <= 0) onExpire();
  }, [secondsLeft, onExpire]);

  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  const danger = secondsLeft <= 60;

  return (
    <span
      className={clsx(
        'rounded-lg px-3 py-1.5 font-mono text-sm font-bold tabular-nums',
        danger ? 'animate-pulse bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
      )}
    >
      {h > 0 ? `${h}:` : ''}{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

// ── Per-type question view ──
function QuestionView({ question, answer, onAnswer }: { question: RunnerQuestion; answer?: AttemptAnswer; onAnswer: (v: unknown) => void }) {
  const value = answer?.value;
  const showHindi = question.textHindi;

  return (
    <div className="card p-6">
      <p className="text-base font-medium leading-relaxed text-slate-900 dark:text-slate-100">{question.text}</p>
      {showHindi && <p className="mt-2 font-deva text-base leading-relaxed text-slate-600 dark:text-slate-300">{question.textHindi}</p>}

      <div className="mt-5">
        {(question.type === 'single_choice' || question.type === 'true_false' || question.type === 'assertion_reason') && (
          <ul className="space-y-2">
            {question.options?.map((opt) => (
              <li key={opt.key}>
                <label className={clsx('flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors', value === opt.key ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800')}>
                  <input type="radio" name={`q-${question._id}`} className="accent-brand-600" checked={value === opt.key} onChange={() => onAnswer(opt.key)} />
                  <span className="font-semibold text-brand-600 dark:text-brand-400">{opt.key}.</span>
                  <span className="text-slate-700 dark:text-slate-200">{opt.text}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {question.type === 'multiple_choice' && (
          <ul className="space-y-2">
            {question.options?.map((opt) => {
              const arr = Array.isArray(value) ? (value as string[]) : [];
              const checked = arr.includes(opt.key);
              return (
                <li key={opt.key}>
                  <label className={clsx('flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors', checked ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800')}>
                    <input
                      type="checkbox"
                      className="accent-brand-600"
                      checked={checked}
                      onChange={() => onAnswer(checked ? arr.filter((k) => k !== opt.key) : [...arr, opt.key])}
                    />
                    <span className="font-semibold text-brand-600 dark:text-brand-400">{opt.key}.</span>
                    <span className="text-slate-700 dark:text-slate-200">{opt.text}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {question.type === 'numerical' && (
          <input
            type="number"
            inputMode="decimal"
            className="input max-w-xs"
            placeholder="Enter your numerical answer"
            value={(value as number | undefined) ?? ''}
            onChange={(e) => onAnswer(e.target.value === '' ? undefined : Number(e.target.value))}
          />
        )}

        {(question.type === 'fill_in_the_blank' || question.type === 'subjective') && (
          <textarea
            className="input min-h-[100px]"
            placeholder="Type your answer…"
            value={(value as string | undefined) ?? ''}
            onChange={(e) => onAnswer(e.target.value)}
          />
        )}

        {(question.type === 'match_the_following' || question.type === 'paragraph' || question.type === 'coding' || question.type === 'audio' || question.type === 'image' || question.type === 'video') && (
          <textarea
            className="input min-h-[120px]"
            placeholder={`This ${question.type.replace(/_/g, ' ')} question — enter your response here.`}
            value={(value as string | undefined) ?? ''}
            onChange={(e) => onAnswer(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}
