import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, EmptyState, Input, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { getApiError } from '../../lib/axios';
import { useGenerateFromTextMutation, useAiHealthQuery } from './aiApi';
import { useListSubjectsQuery } from '../questions/questionsApi';
import type { GenerationResult } from './aiApi';
import { Difficulty, Language } from '../../types';

const schema = z.object({
  topic: z.string().min(2, 'Enter a topic'),
  subject: z.string().optional(),
  count: z.coerce.number().int().min(1).max(20),
  difficulty: z.nativeEnum(Difficulty),
  language: z.nativeEnum(Language),
  type: z.enum(['single_choice', 'multiple_choice', 'true_false', 'fill_in_the_blank', 'numerical', 'assertion_reason']),
  autoSave: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function AIGeneratePage() {
  const toast = useToast();
  const { data: subjects } = useListSubjectsQuery();
  const { data: aiHealth } = useAiHealthQuery();
  const [generate, { isLoading }] = useGenerateFromTextMutation();
  const [result, setResult] = useState<GenerationResult | null>(null);

  const { register: field, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { topic: '', count: 5, difficulty: Difficulty.MEDIUM, language: Language.ENGLISH, type: 'single_choice', autoSave: true },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await generate(values).unwrap();
      setResult(res);
      toast.push(`Generated ${res.generated.length} questions${res.savedCount ? ` · saved ${res.savedCount}` : ''}`, 'success');
    } catch (err) {
      toast.push(getApiError(err), 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">🤖 AI Question Generation</h1>
          <p className="text-sm text-slate-500">Generate exam-ready questions from a topic — with answers & explanations.</p>
        </div>
        <span className={`badge ${aiHealth?.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
          {aiHealth?.enabled
            ? `● AI online · ${aiHealth.provider} · ${aiHealth.model}`
            : '● AI disabled — set GEMINI_API_KEY or OPENAI_API_KEY in server/.env'}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Text → Question</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input label="Topic" placeholder="e.g. Quadratic Equations, Indian Polity" error={errors.topic?.message} {...field('topic')} />
            <label className="block">
              <span className="label">Subject (required to auto-save)</span>
              <select className="input" {...field('subject')}>
                <option value="">— Select subject —</option>
                {subjects?.items.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Count</span>
                <input type="number" min={1} max={20} className="input" {...field('count')} />
              </label>
              <label className="block">
                <span className="label">Difficulty</span>
                <select className="input capitalize" {...field('difficulty')}>
                  {Object.values(Difficulty).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Language</span>
                <select className="input capitalize" {...field('language')}>
                  {Object.values(Language).map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="label">Type</span>
                <select className="input capitalize" {...field('type')}>
                  {['single_choice', 'multiple_choice', 'true_false', 'fill_in_the_blank', 'numerical', 'assertion_reason'].map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" className="accent-brand-600" {...field('autoSave')} />
              Auto-save to question bank (status: pending review)
            </label>
            <Button type="submit" loading={isLoading} className="w-full">✨ Generate</Button>
          </form>
        </Card>

        <div>
          <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">Generated questions</h3>
          {isLoading ? (
            <div className="grid place-items-center py-20"><Spinner className="h-8 w-8" /></div>
          ) : result && result.generated.length > 0 ? (
            <div className="space-y-3">
              {result.savedCount > 0 && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                  ✓ {result.savedCount} question(s) saved to the bank as <strong>pending review</strong>.
                </p>
              )}
              {result.generated.map((q, i) => (
                <Card key={i}>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{i + 1}. {q.text}</p>
                  {q.textHindi && <p className="mt-1 font-deva text-sm text-slate-500">{q.textHindi}</p>}
                  {q.options && (
                    <ul className="mt-2 grid gap-1 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                      {q.options.map((o) => {
                        const correct = Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(o.key) : q.correctAnswer === o.key;
                        return <li key={o.key} className={correct ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}>{o.key}. {o.text} {correct && '✓'}</li>;
                      })}
                    </ul>
                  )}
                  {q.explanation && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-500 dark:bg-slate-800/50"><strong>Explanation:</strong> {q.explanation}</p>}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No questions yet" hint="Fill the form and click Generate to see AI-crafted questions appear here." />
          )}
        </div>
      </div>
    </div>
  );
}
