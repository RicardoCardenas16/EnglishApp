import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generatePlacementTest, evaluatePlacementTest } from '../services/api';

const PlacementTest = () => {
    const [step, setStep] = useState('intro'); // intro, testing, evaluating, result
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (step === 'testing' && questions.length === 0) {
            startTest();
        }
    }, [step]);

    const startTest = async () => {
        setLoading(true);
        try {
            const data = await generatePlacementTest();
            setQuestions(data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            alert(error.message || "Error generating the test. Please try again.");
            setStep('intro');
            setLoading(false);
        }
    };

    const handleAnswer = (option) => {
        const question = questions[currentQuestionIndex];
        const newAnswer = {
            question_id: question.id,
            user_answer: option,
            correct_answer: question.answer,
            level: question.level
        };

        const newAnswers = [...answers, newAnswer];
        setAnswers(newAnswers);

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            submitResults(newAnswers);
        }
    };

    const submitResults = async (finalAnswers) => {
        setStep('evaluating');
        try {
            const data = await evaluatePlacementTest(finalAnswers);
            setResult(data);
            setStep('result');
        } catch (error) {
            console.error(error);
            alert(error.message || "Error evaluating your results. Please try again.");
            setStep('intro');
        }
    };

    if (step === 'intro') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 font-display">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-100 dark:border-slate-800 animate-fade-in-up">
                    <div className="size-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                        <span className="material-symbols-outlined text-4xl text-primary">assessment</span>
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent text-center mb-4">
                        English Level Assessment
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-center mb-8 leading-relaxed">
                        To personalize your learning path, we need to know your current English level. This 15-question AI-powered test will evaluate your grammar, vocabulary, and comprehension.
                    </p>
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className="material-symbols-outlined text-green-500">timer</span>
                            <span>Takes about 5-10 minutes</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className="material-symbols-outlined text-blue-500">psychology</span>
                            <span>Adaptive AI-generated questions</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setStep('testing')}
                        className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/25 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                    >
                        Start Evaluation
                        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-4 uppercase tracking-widest">Powered by Antigravity AI</p>
                </div>
            </div>
        );
    }

    if (loading || step === 'evaluating') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="relative size-24 mx-auto mb-8">
                        <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-primary animate-pulse">
                                {step === 'evaluating' ? 'psychology' : 'auto_awesome'}
                            </span>
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        {step === 'evaluating' ? 'Analyzing your level...' : 'Preparing your test...'}
                    </h2>
                    <p className="text-slate-500 animate-pulse">Our AI is processing. Please wait a moment.</p>
                </div>
            </div>
        );
    }

    if (step === 'testing' && questions.length > 0) {
        const question = questions[currentQuestionIndex];
        const progress = ((currentQuestionIndex) / questions.length) * 100;

        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center">
                <div className="max-w-2xl w-full">
                    {/* Header with Progress Bar */}
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <span className="text-xs font-bold text-primary uppercase tracking-widest">Question {currentQuestionIndex + 1} of {questions.length}</span>
                            <div className="h-2 w-48 bg-slate-200 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded uppercase">{question.level} Level</span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 border border-slate-100 dark:border-slate-800 animate-fade-in">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-8 leading-snug">
                            {question.question}
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {question.options.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(option)}
                                    className="p-5 text-left border-2 border-slate-100 dark:border-slate-800 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all font-medium text-slate-700 dark:text-slate-300 flex justify-between items-center group"
                                >
                                    {option}
                                    <div className="size-6 rounded-full border-2 border-slate-200 dark:border-slate-700 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all">
                                        <div className="size-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'result' && result) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 font-display">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-100 dark:border-slate-800 animate-scale-in">
                    <div className="size-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6 mx-auto relative">
                        <span className="material-symbols-outlined text-5xl text-green-500">verified</span>
                        <div className="absolute -inset-2 border-4 border-green-500/20 rounded-full animate-ping"></div>
                    </div>
                    <h1 className="text-center text-sm text-slate-500 uppercase tracking-widest font-bold mb-2">Evaluation Complete</h1>
                    <h2 className="text-4xl font-black text-center text-slate-900 dark:text-white mb-6">
                        Level <span className="text-primary">{result.level}</span>
                    </h2>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl mb-8 border border-slate-100 dark:border-slate-700">
                        <p className="text-sm text-slate-600 dark:text-slate-300 italic text-center">
                            "{result.summary}"
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        Go to My Dashboard
                        <span className="material-symbols-outlined">dashboard</span>
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default PlacementTest;
