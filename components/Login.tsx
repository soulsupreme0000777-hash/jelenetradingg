
import React, { useState } from 'react';
import { db } from '../services/database';
import { Employee } from '../types';
import { Lock, Mail, ArrowRight } from 'lucide-react';

interface Props {
    onLogin: (user: Employee, isAdmin: boolean) => void;
}

export const Login: React.FC<Props> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { user, isAdmin } = await db.auth.login(email, password);
            if (user) {
                onLogin(user, isAdmin);
            } else {
                setError('Invalid credentials');
            }
        } catch (e) {
            setError('Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>
            </div>

            <div className="bg-zinc-900/80 backdrop-blur-xl w-full max-w-md p-8 rounded-3xl shadow-2xl border border-zinc-800 relative z-10">
                <div className="text-center mb-10 flex flex-col items-center">
                     <div className="w-24 h-24 rounded-2xl overflow-hidden mb-4 shadow-2xl border border-zinc-800">
                        <img src="https://i.imgur.com/legjheA.png" alt="Jelene Trading" className="w-full h-full object-cover" />
                     </div>
                     <h1 className="text-2xl font-bold text-white tracking-tight">Jelene Trading</h1>
                     <p className="text-zinc-500 text-sm mt-1">Secure Attendance Gateway</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="group">
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block tracking-wider group-focus-within:text-violet-500 transition-colors">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5 group-focus-within:text-violet-500 transition-colors" />
                            <input 
                                type="email" required 
                                className="w-full pl-12 pr-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                                placeholder="name@jelene.com"
                                value={email} onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="group">
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block tracking-wider group-focus-within:text-violet-500 transition-colors">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5 group-focus-within:text-violet-500 transition-colors" />
                            <input 
                                type="password" required 
                                className="w-full pl-12 pr-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                                placeholder="••••••••"
                                value={password} onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button 
                        disabled={loading} 
                        className="w-full group bg-zinc-100 hover:bg-white text-zinc-900 py-3.5 rounded-xl font-bold transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                        {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-zinc-600">
                        Protected by Jelene Trading Systems
                    </p>
                </div>
            </div>
        </div>
    );
};
