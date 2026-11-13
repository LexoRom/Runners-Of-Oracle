import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { api, ApiClientError } from '@/api/client';
import type { Submission } from '@/types';
import Button from '@/components/Button';
import Card from '@/components/Card';

export default function ChallengeDetail() {
  const { slug } = useParams();
  const [challenge, setChallenge] = useState<any>(null);
  const [code, setCode] = useState('// Écrivez votre fonction solve(input)\nfunction solve(input) {\n  return input;\n}\n');
  const [result, setResult] = useState<Submission | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api.challenge(slug).then((c: any) => {
      setChallenge(c);
      if (c?.version?.starterCode) setCode(c.version.starterCode);
    }).catch(() => setChallenge(null));
  }, [slug]);

  async function run() {
    if (!challenge) return;
    setRunning(true);
    setError(null);
    try {
      const sub = await api.submit(challenge.id, { language: 'javascript', code });
      setResult(sub as any);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Erreur d’exécution');
    } finally {
      setRunning(false);
    }
  }

  if (!challenge) return <p className="text-[var(--muted)]">Chargement du défi…</p>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title={challenge.title}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{challenge.statement}</p>
        <div className="mt-4 flex items-center gap-3 text-xs text-[var(--muted)]">
          <span>Difficulté {challenge.difficulty}</span>
          <span>Base {challenge.basePoints * challenge.difficulty} pts</span>
          {challenge.tOpt != null && <span>t_opt {challenge.tOpt} ms</span>}
        </div>
        {challenge.version?.statement && (
          <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-sm">
            {challenge.version.statement}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <Editor
            height="360px"
            defaultLanguage="javascript"
            theme="vs-dark"
            value={code}
            onChange={(v) => setCode(v ?? '')}
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
        </div>
        <div className="flex gap-3">
          <Button onClick={run} disabled={running}>{running ? 'Exécution…' : 'Lancer'}</Button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {result && (
          <Card title={`Résultat — ${result.score} pts`}>
            <p className="text-sm">{result.testsPassed}/{result.testsTotal} tests passés · {result.cpuTimeMs ?? '—'} ms</p>
            <pre className="mt-3 max-h-48 overflow-auto rounded bg-[var(--bg)] p-3 text-xs">{result.output}</pre>
          </Card>
        )}
      </div>
    </div>
  );
}
