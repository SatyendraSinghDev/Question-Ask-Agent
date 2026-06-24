import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useListTestsQuery } from './testsApi';
import { Button, Card, EmptyState, Spinner, TestStatusBadge } from '../../components/ui';
import type { Test } from '../../types';

export default function TestsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useListTestsQuery({ search, limit: 24 });
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Available tests</h1>
          <p className="text-sm text-slate-500">Pick a test to begin. You can pause and resume anytime.</p>
        </div>
        <input
          className="input max-w-xs"
          placeholder="Search tests…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : data && data.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((t) => (
            <TestCard key={t._id} test={t} onStart={() => navigate(`/app/tests/${t._id}/run`)} />
          ))}
        </div>
      ) : (
        <EmptyState title="No tests found" hint="Try a different search, or ask an admin to publish a test." />
      )}
    </div>
  );
}

function TestCard({ test, onStart }: { test: Test; onStart: () => void }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 dark:text-white">{test.name}</h3>
        <TestStatusBadge status={test.status} />
      </div>
      {test.description && <p className="line-clamp-2 text-sm text-slate-500">{test.description}</p>}
      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="badge bg-slate-100 capitalize dark:bg-slate-800">{test.examType ?? 'practice'}</span>
        <span className="badge bg-slate-100 dark:bg-slate-800">{test.questions.length} Qs</span>
        <span className="badge bg-slate-100 dark:bg-slate-800">{test.totalMarks} marks</span>
        {test.durationSeconds && (
          <span className="badge bg-slate-100 dark:bg-slate-800">{Math.round(test.durationSeconds / 60)} min</span>
        )}
      </div>
      <Button onClick={onStart} className="mt-auto w-full">Start test →</Button>
    </Card>
  );
}
