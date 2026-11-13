import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiClientError } from '@/api/client';
import Button from '@/components/Button';
import Card from '@/components/Card';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const r: any = await api.register({ email, pseudo, password });
      setMessage(r.message + (r.devLink ? ` (dev) ${r.devLink}` : ''));
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Erreur d’inscription');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card title="Créer un compte">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full" />
          </div>
          <div>
            <label className="mb-1 block text-sm">Pseudo (3–20 caractères)</label>
            <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} required minLength={3} maxLength={20} className="w-full" />
          </div>
          <div>
            <label className="mb-1 block text-sm">Mot de passe (≥ 12 caractères)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={12} className="w-full" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-green-400">{message}</p>}
          <Button type="submit" disabled={loading} className="w-full">{loading ? 'Création…' : 'S’inscrire'}</Button>
        </form>
      </Card>
    </div>
  );
}
