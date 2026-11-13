import express from 'express';
import * as vm from 'node:vm';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.RUNNER_PORT ?? 4000);
const TIMEOUT_MS = Number(process.env.RUNNER_TIMEOUT_MS ?? 5000);

// Script Python écrit côté runner : lit {code, tests} sur stdin, exécute solve() 5 fois, imprime le JSON.
const PYTHON_RUNNER = `import sys, json, time
data = json.load(sys.stdin)
code = data["code"]
tests = data["tests"]
ns = {}
try:
    exec(code, ns)
except Exception as e:
    print(json.dumps({"passed":0,"total":len(tests),"cpuTimeMs":0,"output":"Erreur de compilation : " + str(e)}))
    sys.exit(0)
solve = ns.get("solve")
if not callable(solve):
    print(json.dumps({"passed":0,"total":len(tests),"cpuTimeMs":0,"output":"La fonction solve(input) est introuvable"}))
    sys.exit(0)
passed = 0
total_time = 0.0
outputs = []
for idx, t in enumerate(tests):
    times = []
    ok = False
    for i in range(5):
        start = time.perf_counter()
        try:
            result = solve(t["input"])
            elapsed = (time.perf_counter() - start) * 1000.0
            times.append(elapsed)
            if i == 0:
                ok = (result == t["expected"])
                if not ok:
                    outputs.append("Test %d : attendu %s, obtenu %s" % (idx+1, t["expected"], result))
        except Exception as e:
            outputs.append("Test %d : exception %s" % (idx+1, e))
            break
    if ok:
        passed += 1
    if times:
        times.sort()
        total_time += times[len(times)//2]
print(json.dumps({"passed":passed,"total":len(tests),"cpuTimeMs":round(total_time,2),"output":"\\n".join(outputs) if outputs else "Tous les tests sont passes"}))
`;

const PYTHON_RUNNER_PATH = join(tmpdir(), 'codequest_runner.py');
try { writeFileSync(PYTHON_RUNNER_PATH, PYTHON_RUNNER, 'utf8'); } catch { /* ignore */ }

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
    output: outputs.length ? outputs.join('\n') : 'Tous les tests sont passes',
  };
}

function runPython(code: string, tests: { input: any; expected: any }[]): Promise<any> {
  return new Promise((resolve) => {
    const child = spawn('python', [PYTHON_RUNNER_PATH], { timeout: TIMEOUT_MS });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, TIMEOUT_MS + 500);

    child.stdin.write(JSON.stringify({ code, tests }));
    child.stdin.end();
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ passed: 0, total: tests.length, cpuTimeMs: 0, output: `Python indisponible : ${err.message}` });
    });
    child.on('close', () => {
      clearTimeout(timer);
      const line = stdout.trim().split('\n').pop() || '';
      try {
        resolve(JSON.parse(line));
      } catch {
        resolve({ passed: 0, total: tests.length, cpuTimeMs: 0, output: stderr.trim() || 'Erreur runner Python' });
      }
    });
  });
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'runner', languages: ['javascript', 'python'], isolation: 'node:vm (prototype)', timestamp: new Date().toISOString() });
});

app.post('/run', async (req, res) => {
  const { language, code, tests } = req.body ?? {};
  if (typeof code !== 'string' || !Array.isArray(tests)) {
    return res.status(400).json({ error: 'Payload invalide : { language, code, tests }' });
  }
  if (language === 'python') {
    const result = await runPython(code, tests);
    return res.json(result);
  }
  if (language !== 'javascript') {
    return res.status(400).json({ error: 'Langage non supporte (javascript, python)' });
  }
  res.json(runJs(code, tests));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Runner pret sur http://localhost:${PORT} (JS node:vm, Python subprocess, prototype)`);
});
