import { useStudentDashboardQuery } from './dashboardApi';
import { Card, EmptyState, Spinner, Stat } from '../../components/ui';
import { LineChart, BarChart } from '../../components/Charts';
import { useAppSelector } from '../../app/hooks';
import { UserRole } from '../../types';

export default function DashboardPage() {
  const role = useAppSelector((s) => s.auth.role);
  const { data, isLoading } = useStudentDashboardQuery(undefined, { skip: role !== UserRole.STUDENT });

  if (role !== UserRole.STUDENT) {
    return (
      <EmptyState
        title="Staff dashboard"
        hint="Use the Admin tab for platform-wide analytics, or the Question Bank / Tests tabs to manage content."
      />
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const trend = data.trend ?? [];
  const trendLabels = trend.map((t) => new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
  const trendData = trend.map((t) => t.percentage);

  const weakLabels = data.weakTopics.map((t) => t.topic);
  const weakData = data.weakTopics.map((t) => Math.round(t.accuracy));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Your dashboard</h1>
        <p className="text-sm text-slate-500">Track your performance and find your weak spots.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tests attempted" value={data.attempts} icon="📝" accent="brand" />
        <Stat label="Average score" value={`${data.averageScore}%`} icon="📊" accent="accent" />
        <Stat label="Best score" value={`${data.bestScore}%`} icon="🏆" accent="violet" />
        <Stat label="Certificates" value={data.certificates} icon="🏅" accent="green" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Score trend</h3>
          <div className="h-64">
            {trend.length ? (
              <LineChart labels={trendLabels} data={trendData} />
            ) : (
              <EmptyState title="No attempts yet" hint="Take a test to see your progress here." />
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Weakest topics (accuracy)</h3>
          <div className="h-64">
            {weakLabels.length ? (
              <BarChart labels={weakLabels} data={weakData} color="#ef4444" />
            ) : (
              <EmptyState title="Not enough data" hint="Attempt tests covering several topics." />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">💪 Strong topics</h3>
          <ul className="space-y-2">
            {data.strongTopics.length ? (
              data.strongTopics.map((t) => (
                <li key={t.topic} className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-900/20">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{t.topic}</span>
                  <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{Math.round(t.accuracy)}%</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-500">No data yet.</li>
            )}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">🎯 Focus areas</h3>
          <ul className="space-y-2">
            {data.weakTopics.length ? (
              data.weakTopics.map((t) => (
                <li key={t.topic} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm dark:bg-red-900/20">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{t.topic}</span>
                  <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">{Math.round(t.accuracy)}%</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-500">No data yet.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
