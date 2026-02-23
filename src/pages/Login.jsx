import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from '../services/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // NOTE: Django expects 'username'. We are using email field in UI clearly.
            // For MVP, if input is 'admin', use 'admin'. Else use email as username.
            const userToUse = email === 'admin@example.com' ? 'admin' : email;

            // If full name is provided, assume registration intent
            if (fullName) {
                try {
                    await registerUser(fullName, userToUse, password);
                } catch (regError) {
                    console.warn("Registration attempt failed:", regError.message);
                    // Only try login if user already exists
                    if (regError.message.toLowerCase().includes('exist') || regError.message.toLowerCase().includes('already')) {
                        await loginUser(userToUse, password);
                    } else {
                        // Re-throw if it's a real server error or validation error
                        throw regError;
                    }
                }
            } else {
                await loginUser(userToUse, password);
            }

            navigate('/dashboard');
        } catch (error) {
            console.error('Final login error:', error);
            // Show the actual error message or the error object itself stringified
            const errorMessage = error.message || JSON.stringify(error);
            alert(`[System Notice] ${errorMessage}`);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center">
            <div className="relative flex h-full min-h-screen w-full max-w-[430px] flex-col bg-white dark:bg-background-dark overflow-x-hidden shadow-2xl">

                {/* Header/Navigation */}
                <div className="flex items-center bg-white dark:bg-background-dark p-4 justify-between">
                    <div className="text-[#111318] dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer">
                        <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
                    </div>
                    <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">
                        Register
                    </h2>
                </div>

                {/* Hero Section */}
                <div className="flex flex-col items-center px-6 pt-8 pb-4">
                    <div className="mb-6">
                        <img
                            src="/logo.jpg"
                            alt="Chori Logo"
                            className="w-24 h-24 rounded-3xl shadow-xl object-cover border-4 border-white dark:border-gray-800"
                        />
                    </div>
                    <h1 className="text-[#111318] dark:text-white tracking-tight text-3xl font-bold leading-tight text-center pb-3">
                        EnglishApp by Chori
                    </h1>
                    <p className="text-[#616f89] dark:text-gray-400 text-sm font-normal leading-relaxed text-center px-4">
                        Master Reading, Writing, Listening, and Speaking across all levels (A1 to B2).<br />
                        <span className="text-[10px] opacity-30">V1.0.6 - Debug Ready</span>
                    </p>
                </div>

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-4">
                    <label className="flex flex-col w-full">
                        <p className="text-[#111318] dark:text-gray-200 text-sm font-medium leading-normal pb-2 px-1">Full Name</p>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">person</span>
                            <input
                                className="form-input flex w-full rounded-xl text-[#111318] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-primary h-14 placeholder:text-[#616f89] pl-12 pr-4 text-base font-normal"
                                placeholder="John Doe"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>
                    </label>

                    <label className="flex flex-col w-full">
                        <p className="text-[#111318] dark:text-gray-200 text-sm font-medium leading-normal pb-2 px-1">Email Address</p>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">mail</span>
                            <input
                                className="form-input flex w-full rounded-xl text-[#111318] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-primary h-14 placeholder:text-[#616f89] pl-12 pr-4 text-base font-normal"
                                placeholder="example@email.com"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </label>

                    <label className="flex flex-col w-full">
                        <p className="text-[#111318] dark:text-gray-200 text-sm font-medium leading-normal pb-2 px-1">Password</p>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
                            <input
                                className="form-input flex w-full rounded-xl text-[#111318] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#dbdfe6] dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-primary h-14 placeholder:text-[#616f89] pl-12 pr-12 text-base font-normal"
                                placeholder="Min. 8 characters"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <span
                                className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer select-none"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? 'visibility_off' : 'visibility'}
                            </span>
                        </div>
                    </label>

                    {/* Main Action */}
                    <div className="pt-2">
                        <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                            <span>Start Learning</span>
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                </form>

                {/* Divider */}
                <div className="flex items-center px-6 py-6">
                    <div className="flex-grow border-t border-[#dbdfe6] dark:border-gray-700"></div>
                    <span className="px-4 text-sm text-[#616f89] dark:text-gray-400 font-medium">Or continue with</span>
                    <div className="flex-grow border-t border-[#dbdfe6] dark:border-gray-700"></div>
                </div>

                {/* Social Logins */}
                <div className="flex flex-col gap-3 px-6 pb-8">
                    <button className="w-full bg-black text-white py-3.5 rounded-xl flex items-center justify-center gap-3 font-medium transition-opacity hover:opacity-90">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.05,20.28c-.96,.95-2.18,1.74-3.66,2.05-1.5,.31-3.08,.09-4.48-.63-1.42-.72-2.58-1.89-3.32-3.35-.74-1.46-.96-3.13-.63-4.71,.32-1.58,1.21-3.01,2.51-4.04,1.3-1.03,2.94-1.59,4.61-1.58,1.67,0,3.29,.58,4.58,1.63,.65,.52,1.21,1.15,1.65,1.87l-2.07,1.19c-.31-.48-.71-.89-1.18-1.21-.8-.55-1.78-.85-2.78-.84-1.17,0-2.31,.44-3.2,1.24-.89,.8-1.48,1.91-1.65,3.13-.17,1.22,.12,2.46,.82,3.5,.7,1.04,1.75,1.8,2.96,2.15,1.21,.35,2.5,.18,3.58-.48,.56-.34,1.05-.79,1.43-1.32l2.35,1.42Zm-2.76-13.84c.82-.99,1.26-2.25,1.24-3.54,0-.15-.01-.29-.02-.44-.15,.01-.3,.03-.45,.06-1.23,.24-2.34,1-3.04,2.07-.7,1.07-1,2.37-.82,3.67,.15,.01,.3,.02,.45,.02,1.12,0,2.14-.38,2.64-1.84Z"></path>
                        </svg>
                        Sign up with Apple
                    </button>
                    <button className="w-full bg-white dark:bg-white border border-[#dbdfe6] text-[#111318] py-3.5 rounded-xl flex items-center justify-center gap-3 font-medium transition-all hover:bg-gray-50">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"></path>
                        </svg>
                        Sign up with Google
                    </button>
                </div>

                {/* Footer */}
                <div className="mt-auto pb-10 text-center">
                    <p className="text-[#616f89] dark:text-gray-400 text-sm">
                        Already have an account?
                        <a className="text-primary font-bold ml-1 hover:underline" href="#">Log In</a>
                    </p>
                </div>

                {/* Background Decoration Elements */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute top-1/2 -left-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
            </div>
        </div>
    );
};

export default Login;
