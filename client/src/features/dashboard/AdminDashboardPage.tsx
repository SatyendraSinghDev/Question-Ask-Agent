import { useAdminDashboardQuery } from './dashboardApi';
import { Card, Spinner, Stat } from '../../components/ui';
import { BarChart } from '../../components/Charts';

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboardQuery();

  if (isLoading || !data) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const aiPct = data.questions.total ? Math.round((data.questions.aiGenerated / data.questions.total) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform overview</h1>
        <p className="text-sm text-slate-500">A snapshot of users, tests, and AI-generated content.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total users" value={data.users.total} icon="👥" accent="brand" />
        <Stat label="Active tests" value={data.tests.active} icon="🟢" accent="green" />
        <Stat label="AI questions" value={data.questions.aiGenerated} icon="🤖" accent="violet" />
        <Stat label="Certificates issued" value={data.certificates} icon="🏅" accent="accent" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="text-sm font-semibold text-slate-500">Students</h3>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{data.users.students}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-slate-500">Staff</h3>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{data.users.staff}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-slate-500">AI share of questions</h3>
          <p className="mt-1 text-3xl font-bold text-violet-600 dark:text-violet-400">{aiPct}%</p>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">New users (last 14 days)</h3>
        <div className="h-64">
          {data.dailyUsers.length ? (
            <BarChart
              labels={data.dailyUsers.map((d) => d._id.slice(5))}
              data={data.dailyUsers.map((d) => d.count)}
              color="#8B5CF6"
            />
          ) : (
            <p className="grid h-full place-items-center text-sm text-slate-500">No recent signups.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
