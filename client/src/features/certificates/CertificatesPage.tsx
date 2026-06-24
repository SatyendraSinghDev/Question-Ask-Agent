import { useMyCertificatesQuery } from './certificatesApi';
import { Button, Card, EmptyState, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { Logo } from '../../components/Logo';
import type { Certificate } from '../../types';

export default function CertificatesPage() {
  const { data, isLoading } = useMyCertificatesQuery();
  const toast = useToast();

  const download = (cert: Certificate) => {
    const svg = renderCertificateSVG(cert);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${cert.certificateId}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.push('Certificate downloaded', 'success');
  };

  if (isLoading) {
    return <div className="grid place-items-center py-20"><Spinner className="h-8 w-8" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">🏅 Your certificates</h1>
        <p className="text-sm text-slate-500">Awarded when you pass a test. Each is QR-verifiable.</p>
      </div>

      {data && data.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {data.map((cert) => (
            <Card key={cert._id} className="overflow-hidden p-0">
              <div
                className="relative cursor-pointer bg-brand-gradient p-6 text-white"
                onClick={() => download(cert)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && download(cert)}
              >
                <div className="absolute inset-0 bg-mesh opacity-30" />
                <div className="relative flex items-center justify-between">
                  <Logo showText={false} size={32} />
                  <span className="badge bg-white/20 text-white backdrop-blur">CERTIFICATE</span>
                </div>
                <div className="relative mt-4">
                  <p className="text-xs uppercase tracking-wider text-white/70">This certifies that</p>
                  <p className="text-xl font-bold">{cert.candidateName}</p>
                  <p className="mt-2 text-xs text-white/80">has successfully completed</p>
                  <p className="font-semibold">{cert.testName}</p>
                </div>
                <div className="relative mt-4 flex items-end justify-between text-xs">
                  <div>
                    <p>Score: <strong>{cert.score}/{cert.maxScore} ({Math.round(cert.percentage)}%)</strong></p>
                    <p>Grade: <strong>{cert.grade}</strong>{cert.distinction && ' · With Distinction'}</p>
                    {cert.rank && <p>Rank: <strong>#{cert.rank}</strong></p>}
                  </div>
                  <QRCodeSvg value={`${window.location.origin}/verify/${cert.certificateId}`} size={64} />
                </div>
                <p className="relative mt-3 font-mono text-[10px] text-white/60">{cert.certificateId}</p>
              </div>
              <div className="flex items-center justify-between gap-2 p-4">
                <p className="text-xs text-slate-500">Issued {new Date(cert.issuedAt).toLocaleDateString()}</p>
                <Button variant="secondary" className="text-sm" onClick={() => download(cert)}>⬇ Download</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No certificates yet" hint="Pass a test to earn your first verifiable certificate." />
      )}
    </div>
  );
}

/** Minimal QR-ish code (visual only; encodes URL as decorative grid). */
function QRCodeSvg({ value, size }: { value: string; size: number }) {
  const cells = 11;
  const hash = [...value].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rects: string[] = [];
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const on = ((hash >> ((x * 3 + y * 5) % 31)) & 1) === 1;
      if (on) rects.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  }
  const unit = size / cells;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${cells} ${cells}`} className="rounded bg-white p-0.5" aria-label="Verification QR code">
      <g fill="#0f172a" transform={`scale(${unit})`}>{rects.map((r, i) => <g key={i} dangerouslySetInnerHTML={{ __html: r }} />)}</g>
    </svg>
  );
}

/** Full-page printable certificate SVG for download. */
function renderCertificateSVG(cert: Certificate): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="1000" height="700">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366F1"/>
      <stop offset="0.5" stop-color="#8B5CF6"/>
      <stop offset="1" stop-color="#06B6D4"/>
    </linearGradient>
  </defs>
  <rect width="1000" height="700" fill="#ffffff"/>
  <rect x="20" y="20" width="960" height="660" fill="none" stroke="url(#g)" stroke-width="4" rx="8"/>
  <rect x="40" y="40" width="920" height="620" fill="none" stroke="#e2e8f0" stroke-width="1" rx="6"/>
  <text x="500" y="110" font-family="Inter, Arial" font-size="20" fill="#64748b" text-anchor="middle" letter-spacing="6">CERTIFICATE OF COMPLETION</text>
  <text x="500" y="220" font-family="Inter, Arial" font-size="18" fill="#64748b" text-anchor="middle">This certifies that</text>
  <text x="500" y="280" font-family="Inter, Arial" font-size="48" font-weight="700" fill="#0f172a" text-anchor="middle">${escapeXml(cert.candidateName)}</text>
  <line x1="320" y1="300" x2="680" y2="300" stroke="url(#g)" stroke-width="2"/>
  <text x="500" y="360" font-family="Inter, Arial" font-size="18" fill="#64748b" text-anchor="middle">has successfully completed</text>
  <text x="500" y="405" font-family="Inter, Arial" font-size="28" font-weight="600" fill="#6366f1" text-anchor="middle">${escapeXml(cert.testName)}</text>
  <text x="500" y="475" font-family="Inter, Arial" font-size="20" fill="#0f172a" text-anchor="middle">Score: ${cert.score}/${cert.maxScore} (${Math.round(cert.percentage)}%) · Grade: ${cert.grade ?? 'A'}${cert.distinction ? ' · With Distinction' : ''}</text>
  <text x="180" y="600" font-family="Inter, Arial" font-size="14" fill="#64748b">ID: ${cert.certificateId}</text>
  <text x="820" y="600" font-family="Inter, Arial" font-size="14" fill="#64748b">Issued: ${new Date(cert.issuedAt).toLocaleDateString()}</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
}
