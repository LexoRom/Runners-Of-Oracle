import express from 'express';
import * as vm from 'node:vm';

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.RUNNER_PORT ?? 4000);
const TIMEOUT_MS = Number(process.env.RUNNER_TIMEOUT_MS ?? 5000);

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function runJs(code: string, tests: { input: any; expected: any }[]) {
  const sandbox: any = { console: { log: () => {} } };
  vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });

  let compiled: any;
  try {
    const script = new vm.Script(`${code}\n; (typeof solve === 'function' ? solve : null);`);
    compiled = script.runInContext(sandbox, { timeout: TIMEOUT_MS });
  } catch (e: any) {
    return { passed: 0, total: tests.length, cpuTimeMs: 0, output: `Erreur de compilation : ${e?.message ?? e}` };
  }
  if (typeof compiled !== 'function') {
    return { passed: 0, total: tests.length, cpuTimeMs: 0, output: 'La fonction solve(input) est introuvable' };
  }

  let passed = 0;
  let totalTime = 0;
  const outputs: string[] = [];

  for (const t of tests) {
    const times: number[] = [];
    let ok = false;
    for (let i = 0; i < 5; i++) {
      const start = process.hrtime.bigint();
      try {
        const result = compiled(t.input);
        const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
        times.push(elapsed);
        if (i === 0) {
          ok = JSON.stringify(result) === JSON.stringify(t.expected);
          if (!ok) outputs.push(`Test ${tests.indexOf(t) + 1} : attendu ${JSON.stringify(t.expected)}, obtenu ${JSON.stringify(result)}`);
        }
      } catch (e: any) {
        outputs.push(`Test ${tests.indexOf(t) + 1} : exception ${e?.message ?? e}`);
        break;
      }
    }
    if (ok) passed++;
    if (times.length) {
      times.sort((a, b) => a - b);
      totalTime += times[Math.floor(times.length / 2)];
    }
  }

  return {
    passed,
    total: tests.length,
    cpuTimeMs: Math.round(totalTime * 100) / 100,
    output: outputs.length ? outputs.join('\n') : 'Tous les tests sont passés',
  };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'runner', isolation: 'node:vm (prototype)', timestamp: new Date().toISOString() });
});

app.post('/run', (req, res) => {
  const { language, code, tests } = req.body ?? {};
  if (language !== 'javascript') {
    return res.status(400).json({ error: 'Langage non supporté par ce runner (javascript uniquement en v1)' });
  }
  if (typeof code !== 'string' || !Array.isArray(tests)) {
    return res.status(400).json({ error: 'Payload invalide : { language, code, tests }' });
  }
  try {
    const result = runJs(code, tests);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Erreur runner' });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Runner prêt sur http://localhost:${PORT} (isolation node:vm, prototype)`);
});
