import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiClientError } from '@/api/client';
import Button from '@/components/Button';
import Card from '@/components/Card';

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.login({ identifier, password });
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card title="Connexion">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">E-mail ou pseudo</label>
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required className="w-full" />
          </div>
          <div>
            <label className="mb-1 block text-sm">Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">{loading ? 'Connexion…' : 'Se connecter'}</Button>
        </form>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Pas de compte ? <a href="/register">S’inscrire</a> · <a href="/forgot">Mot de passe oublié</a>
        </p>
      </Card>
    </div>
  );
}
