import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { RequireAuth, RequireRole } from './components/guards';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { UserRole } from './types';

const LandingPage = lazy(() => import('./features/landing/LandingPage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const AdminDashboardPage = lazy(() => import('./features/dashboard/AdminDashboardPage'));
const TestsPage = lazy(() => import('./features/tests/TestsPage'));
const QuestionBankPage = lazy(() => import('./features/questions/QuestionBankPage'));
const AIGeneratePage = lazy(() => import('./features/ai/AIGeneratePage'));
const ResultsPage = lazy(() => import('./features/results/ResultsPage'));
const CertificatesPage = lazy(() => import('./features/certificates/CertificatesPage'));
const TestRunnerPage = lazy(() => import('./features/tests/TestRunnerPage'));

function Fallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-mesh dark:bg-slate-950">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/app"
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="tests" element={<TestsPage />} />
              <Route path="question-bank" element={<RequireRole roles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EXAMINER]}><QuestionBankPage /></RequireRole>} />
              <Route path="ai-generate" element={<RequireRole roles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}><AIGeneratePage /></RequireRole>} />
              <Route path="results" element={<ResultsPage />} />
              <Route path="certificates" element={<CertificatesPage />} />
              <Route path="admin" element={<RequireRole roles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}><AdminDashboardPage /></RequireRole>} />
            </Route>

            {/* Fullscreen test runner (outside the app shell) */}
            <Route
              path="/app/tests/:testId/run"
              element={
                <RequireAuth>
                  <TestRunnerPage />
                </RequireAuth>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </BrowserRouter>
  );
}
