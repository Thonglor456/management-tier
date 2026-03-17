import React, { useState } from 'react';
import User from 'lucide-react/dist/esm/icons/user';
import Lock from 'lucide-react/dist/esm/icons/lock';
import X from 'lucide-react/dist/esm/icons/x';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import logo from '../assets/tier-logo.png';

export const LoginScreen: React.FC = () => {
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const isMasterCode = loginUsername === '9999';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setIsLoading(true);

        try {
            // Check for Master Access Code
            if (isMasterCode) {
                // Map to hidden admin account
                await signInWithEmailAndPassword(auth, 'admin@tiercoffee.com', 'tier8888');
            } else {
                // Normal Email Login
                const email = loginUsername.includes('@') ? loginUsername : `${loginUsername}@tiercoffee.com`;
                await signInWithEmailAndPassword(auth, email, loginPassword);
            }
        } catch (error: any) {
            console.error("Login Error:", error);
            if (isMasterCode) {
                setLoginError('เข้าสู่ระบบไม่สำเร็จ: กรุณาตรวจสอบว่ามี User "admin@tiercoffee.com" ใน Firebase และรหัสผ่านถูกต้อง (tier8888)');
            } else {
                setLoginError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans relative overflow-hidden selection:bg-violet-500/30 selection:text-violet-200">
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-800/20 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>
                <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse-slow delay-2000"></div>
            </div>

            {/* Glassmorphism Card */}
            <div className="w-full max-w-[420px] bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05] rounded-3xl shadow-2xl p-8 sm:p-10 relative z-10 animate-fade-in-up">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-24 h-24 mx-auto mb-6 relative group">
                        <div className="absolute inset-0 bg-violet-600/20 rounded-full blur-xl group-hover:bg-violet-600/30 transition-all duration-500"></div>
                        <img
                            src={logo}
                            alt="Tier Coffee Logo"
                            className="w-full h-full object-contain relative z-10 drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">TIER COFFEE</h1>
                    <p className="text-white/40 text-sm font-light tracking-wide uppercase">Enterprise Management System</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-white/50 ml-1 uppercase tracking-wider">Username or Access Code</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User size={18} className="text-white/30 group-focus-within:text-violet-400 transition-colors duration-300" />
                            </div>
                            <input
                                type="text"
                                required
                                value={loginUsername}
                                onChange={(e) => setLoginUsername(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] rounded-2xl text-white placeholder:text-white/20 outline-none focus:border-violet-500/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-violet-500/10 transition-all duration-300"
                                placeholder="Enter username or code"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {!isMasterCode && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Password</label>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock size={18} className="text-white/30 group-focus-within:text-violet-400 transition-colors duration-300" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] rounded-2xl text-white placeholder:text-white/20 outline-none focus:border-violet-500/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-violet-500/10 transition-all duration-300"
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    )}
                    {isMasterCode && (
                        <div className="flex items-center gap-3 px-4 py-3.5 bg-violet-500/5 border border-violet-500/20 rounded-2xl">
                            <Lock size={18} className="text-violet-400/50 shrink-0" />
                            <span className="text-sm text-violet-300/60 font-medium">Master Access — ไม่ต้องใส่รหัสผ่าน</span>
                        </div>
                    )}

                    {loginError && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm p-3 rounded-xl flex items-center gap-3 animate-shake">
                            <X size={16} className="shrink-0" />
                            {loginError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-violet-900/30 hover:shadow-violet-600/40 transition-all duration-300 transform hover:-translate-y-0.5 mt-2 flex items-center justify-center gap-2 group ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Sign In to Dashboard</span>
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    <div className="pt-4 text-center">
                        <p className="text-white/20 text-xs">
                            © 2024 Tier Coffee Enterprise. All rights reserved.
                        </p>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.1); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 8s infinite ease-in-out;
                }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out;
                }
            `}</style>
        </div>
    );
};
