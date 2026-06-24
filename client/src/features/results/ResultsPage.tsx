import { Link, useParams } from 'react-router-dom';
import { useGetResultQuery, useMyResultsQuery } from './resultsApi';
import { Button, Card, EmptyState, Spinner } from '../../components/ui';
import { BarChart, DoughnutChart } from '../../components/Charts';

export default function ResultsPage() {
  const { resultId } = useParams<{ resultId?: string }>();

  if (resultId) return <ResultDetail id={resultId} />;
  return <ResultsList />;
}

function ResultsList() {
  const { data, isLoading } = useMyResultsQuery({ limit: 25 });
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Your results</h1>
        <p className="text-sm text-slate-500">Click a result to see full analytics.</p>
      </div>
      {isLoading ? (
        <div className="grid place-items-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : data && data.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((r) => {
            const test = typeof r.test === 'object' ? r.test : null;
            return (
              <Card key={r._id} className="flex flex-col gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">{test?.name ?? 'Test'}</h3>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${r.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{Math.round(r.percentage)}%</span>
                  <span className="text-sm text-slate-500">{r.score}/{r.maxScore}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs text-slate-500">
                  <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{r.correct} ✓</span>
                  <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">{r.incorrect} ✕</span>
                  <span className="badge bg-slate-100 dark:bg-slate-800">{r.unattempted} –</span>
                </div>
                <Link to={`/app/results/${r._id}`} className="btn-secondary mt-2 text-sm">View analysis →</Link>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No results yet" hint="Take a test and your detailed performance will appear here." />
      )}
    </div>
  );
}

function ResultDetail({ id }: { id: string }) {
  const { data: result, isLoading } = useGetResultQuery(id);

  if (isLoading || !result) {
    return <div className="grid place-items-center py-20"><Spinner className="h-8 w-8" /></div>;
  }

  const test = typeof result.test === 'object' ? result.test : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/app/results" className="text-sm text-slate-500 hover:text-slate-700">← All results</Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{test?.name ?? 'Test'} — Result</h1>
        </div>
        {result.passed && (
          <Link to="/app/certificates">
            <Button>🏅 Get certificate</Button>
          </Link>
        )}
      </div>

      {/* Score header */}
      <Card className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-4">
          <div className={`grid h-20 w-20 place-items-center rounded-full text-xl font-bold ${result.passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
            {Math.round(result.percentage)}%
          </div>
          <div>
            <p className="text-sm text-slate-500">Score</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{result.score} / {result.maxScore}</p>
            <p className={`text-sm font-semibold ${result.passed ? 'text-emerald-600' : 'text-red-600'}`}>{result.passed ? 'PASSED' : 'FAILED'}</p>
          </div>
        </div>
        <div className="ml-auto grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
          <Mini label="Correct" value={result.correct} color="text-emerald-600" />
          <Mini label="Incorrect" value={result.incorrect} color="text-red-600" />
          <Mini label="Skipped" value={result.unattempted} color="text-slate-500" />
          <Mini label="Accuracy" value={`${Math.round(result.accuracy)}%`} color="text-brand-600" />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Answer breakdown</h3>
          <div className="mx-auto h-60 w-60">
            <DoughnutChart
              labels={['Correct', 'Incorrect', 'Unattempted']}
              data={[result.correct, result.incorrect, result.unattempted]}
            />
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Difficulty-wise performance</h3>
          <div className="h-60">
            {result.difficultyWise && result.difficultyWise.length > 0 ? (
              <BarChart
                labels={result.difficultyWise.map((d) => d.key)}
                data={result.difficultyWise.map((d) => (d.total ? Math.round((d.correct / d.total) * 100) : 0))}
                color="#8B5CF6"
              />
            ) : <EmptyState title="No breakdown" />}
          </div>
        </Card>
      </div>

      {result.subjectWise && result.subjectWise.length > 0 && (
        <Card>
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Subject-wise performance</h3>
          <div className="h-60">
            <BarChart
              labels={result.subjectWise.map((d) => d.key)}
              data={result.subjectWise.map((d) => (d.total ? Math.round((d.correct / d.total) * 100) : 0))}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return (
    <div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
