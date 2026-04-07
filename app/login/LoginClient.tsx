'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import './login.css';

export default function LoginClient() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('erro') === '1') {
      setError(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const createParticles = () => {
      const particleCount = 35;
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const size = Math.random() * 6 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${Math.random() * 8 + 5}s`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        particle.style.opacity = `${Math.random() * 0.4 + 0.1}`;
        document.body.appendChild(particle);
      }
    };

    createParticles();

    return () => {
      const particles = document.querySelectorAll('.particle');
      particles.forEach((p) => p.remove());
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    if (!email || !password) {
      alert('Por favor, preencha e-mail e senha.');
      setLoading(false);
      return;
    }

    if (!email.includes('@')) {
      alert('Insira um e-mail válido.');
      setLoading(false);
      return;
    }

    const result = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      remember: remember ? 'true' : 'false',
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(true);
    } else {
      router.push('/dashboard');
    }
  };

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-x-hidden bg-gradient-to-br from-[#1a0b2e] via-[#2e1a4a] to-[#3c1e5e]">
      <div className="w-full max-w-md px-4 py-8 card-appear">
        <div className="glass-card p-8 md:p-10 shadow-2xl transition-all duration-500 hover:shadow-purple-500/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 shadow-lg mb-4">
              <i className="fas fa-code text-white text-3xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">V-Team</h1>
            <p className="text-purple-200 text-sm mt-1">Central de controle da equipe</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-purple-300 text-sm"></i>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-white/10 border border-purple-300/30 rounded-xl text-white placeholder-purple-200/70 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all duration-200 input-focus"
                placeholder="seu@email.com"
                disabled={loading}
              />
            </div>

            <div className="relative">
              <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-purple-300 text-sm"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-12 py-3 bg-white/10 border border-purple-300/30 rounded-xl text-white placeholder-purple-200/70 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all duration-200 input-focus"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={togglePassword}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-300 hover:text-purple-100 focus:outline-none"
                disabled={loading}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-purple-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-purple-300 bg-white/10 text-purple-600 focus:ring-purple-500"
                  disabled={loading}
                />
                <span className="ml-2">Manter conectado</span>
              </label>
              <a href="#" className="link-premium text-sm">Esqueceu a senha?</a>
            </div>

            <button
              type="submit"
              className={`btn-glow w-full py-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <i className="fas fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fas fa-sign-in-alt mr-2"></i>
              )}
              {loading ? 'Acessando...' : 'Acessar plataforma'}
            </button>

            {error && (
              <div className="bg-red-500/20 border border-red-400/50 text-red-200 px-4 py-2 rounded-lg text-sm text-center animate-pulse">
                <i className="fas fa-exclamation-triangle mr-1"></i> E-mail ou senha inválidos.
              </div>
            )}
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-purple-300/20"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-transparent px-2 text-purple-200/60">Acesso restrito à equipe</span>
            </div>
          </div>

          <div className="text-center text-purple-300/40 text-xs mt-4">
            <i className="fas fa-shield-alt mr-1"></i> Ambiente seguro • v1.0
          </div>
        </div>

        <div className="text-center text-purple-300/30 text-[11px] mt-6">
          © 2025 V-Team • Gestão de performance ágil
        </div>
      </div>
    </div>
  );
}