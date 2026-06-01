import React, { useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { initiateLogin } from '../utils/authService';

export const LoginScreen: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            await initiateLogin();
        } catch (e) {
            console.error('Failed to initiate login', e);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative">
            <div className="bg-scene"><div className="orb orb-1"/><div className="orb orb-2"/><div className="orb orb-3"/><div className="absolute inset-0 backdrop-blur-[80px]"/></div>
            <div className="grain"/>

            <div className="glass-panel p-12 rounded-[40px] shadow-2xl max-w-md w-full relative z-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-8">
                    <Activity className="w-10 h-10" />
                </div>
                
                <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">Industrial AI <span className="text-blue-600">Gams</span></h1>
                <p className="label-meta opacity-50 mb-12">Connectez-vous pour accéder à votre espace de travail intelligent.</p>
                
                <button 
                    onClick={handleLogin} 
                    disabled={isLoading}
                    className="btn-primary w-full h-16 rounded-[24px] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-500/10"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {isLoading ? 'CONNEXION EN COURS...' : 'SE CONNECTER'}
                </button>
            </div>
        </div>
    );
};
