import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const BRAND = '#6366F1';
const ACCENT = '#06B6D4';
const VIOLET = '#8B5CF6';

const tickStyle = { color: '#94a3b8' } as const;
const gridColor = 'rgba(148,163,184,0.15)';

// ── Doughnut (e.g. correct/incorrect/unattempted) ──
export function DoughnutChart({
  labels,
  data,
  colors,
}: {
  labels: string[];
  data: number[];
  colors?: string[];
}) {
  return (
    <Doughnut
      data={{
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors ?? ['#10b981', '#ef4444', '#94a3b8'],
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '68%',
      }}
    />
  );
}

// ── Bar chart ──
export function BarChart({
  labels,
  data,
  color = BRAND,
}: {
  labels: string[];
  data: number[];
  color?: string;
}) {
  return (
    <Bar
      data={{
        labels,
        datasets: [{ label: '', data, backgroundColor: color, borderRadius: 6, maxBarThickness: 36 }],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: tickStyle },
          y: { grid: { color: gridColor }, ticks: tickStyle },
        },
      }}
    />
  );
}

// ── Line / trend chart ──
export function LineChart({
  labels,
  data,
  color = BRAND,
}: {
  labels: string[];
  data: number[];
  color?: string;
}) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            data,
            borderColor: color,
            backgroundColor: color + '22',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: color,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: tickStyle },
          y: { grid: { color: gridColor }, ticks: tickStyle },
        },
      }}
    />
  );
}

export const CHART_COLORS = { BRAND, ACCENT, VIOLET };

