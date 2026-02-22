import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTopics, fetchDashboardData, fetchUserProgress } from '../services/api';

const LearningPath = () => {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [progressMap, setProgressMap] = useState({}); // { lessonId: boolean }
    const [userLevel, setUserLevel] = useState('A1');
    const [expandedTopic, setExpandedTopic] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                const [topicsData, dashboardData, progressData] = await Promise.all([
                    fetchTopics(),
                    fetchDashboardData(),
                    fetchUserProgress()
                ]);

                // If the user hasn't completed the placement test, redirect them
                if (dashboardData.profile && !dashboardData.profile.has_completed_placement_test) {
                    navigate('/placement-test');
                    return;
                }

                if (dashboardData.profile) {
                    setUserLevel(dashboardData.profile.level);
                }

                setTopics(topicsData);

                const map = {};
                progressData.forEach(p => {
                    if (p.completed) map[p.lesson.id] = true;
                });
                setProgressMap(map);

                // Expand the first topic that has uncompleted lessons
                const firstPartialTopic = topicsData.find(t => t.lessons.some(l => !map[l.id]));
                if (firstPartialTopic) setExpandedTopic(firstPartialTopic.id);
                else if (topicsData.length > 0) setExpandedTopic(topicsData[0].id);

            } catch (error) {
                console.error("Error loading path:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) return <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white flex items-center justify-center">Loading...</div>;

    const allLessons = topics.flatMap(t => t.lessons);
    const completedCount = allLessons.filter(l => !!progressMap[l.id]).length;
    const totalCount = allLessons.length || 1;
    const progressPercent = (completedCount / totalCount) * 100;

    const levelLabels = {
        'A1': 'Beginner',
        'A2': 'Basic',
        'B1': 'Intermediate',
        'B2': 'Upper Intermediate',
        'C1': 'Advanced'
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen flex flex-col font-display">

            {/* Header Section */}
            <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center p-4 justify-between max-w-md mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="text-primary cursor-pointer" onClick={() => navigate('/dashboard')}>
                            <span className="material-symbols-outlined text-2xl">arrow_back_ios</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-tight tracking-tight">Nivel {userLevel}</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{levelLabels[userLevel] || 'Beginner'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                            <span className="text-primary text-xs font-bold uppercase tracking-wider">{completedCount}/{allLessons.length} lecciones</span>
                        </div>
                    </div>
                </div>
                {/* Global Progress Bar */}
                <div className="w-full h-1 bg-slate-200 dark:bg-slate-800">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto max-w-md mx-auto w-full pb-24">
                <section className="p-4">
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-primary">Temáticas de Estudio</h2>
                            <span className="text-xs font-medium text-emerald-500 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">check_circle</span> Activas
                            </span>
                        </div>

                        <div className="space-y-4">
                            {topics.map((topic, tIdx) => {
                                const topicCompletedCount = topic.lessons.filter(l => progressMap[l.id]).length;
                                const isTopicDone = topicCompletedCount === topic.lessons.length && topic.lessons.length > 0;
                                const isExpanded = expandedTopic === topic.id;

                                return (
                                    <div key={topic.id} className="bg-white dark:bg-[#1c1f27] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all mb-6">
                                        {/* Topic Header */}
                                        <button
                                            onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                                            className={`w-full flex items-center justify-between p-6 transition-colors ${isExpanded ? 'bg-primary/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={`size-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform ${isTopicDone ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-primary text-white shadow-primary/20'} ${isExpanded ? 'scale-110' : ''}`}>
                                                    <span className="material-symbols-outlined text-3xl">
                                                        {isTopicDone ? 'verified' : (tIdx === 0 ? 'rocket_launch' : 'menu_book')}
                                                    </span>
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight mb-1">{topic.title}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex -space-x-1">
                                                            {[1, 2, 3, 4, 5].map(i => (
                                                                <div key={i} className={`size-1.5 rounded-full ${i <= topicCompletedCount ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                                            ))}
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black">
                                                            {topicCompletedCount} / {topic.lessons.length} COMPLETADO
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}>
                                                arrow_drop_down_circle
                                            </span>
                                        </button>

                                        {/* Topic Lessons (Expandable) */}
                                        <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] border-t border-slate-100 dark:border-slate-800' : 'max-h-0'} overflow-hidden`}>
                                            <div className="p-4 space-y-3">
                                                {topic.lessons.sort((a, b) => a.order - b.order).map((lesson) => {
                                                    const isLocked = false; // For now keep all unlocked within topic
                                                    const isDone = !!progressMap[lesson.id];

                                                    return (
                                                        <div
                                                            key={lesson.id}
                                                            onClick={() => navigate(`/lesson/${lesson.id}`)}
                                                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all 
                                                                ${isDone ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'}
                                                            `}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`size-8 rounded-lg flex items-center justify-center ${isDone ? 'bg-green-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                                                                    <span className="material-symbols-outlined text-sm">
                                                                        {lesson.type === 'READING' ? 'menu_book' :
                                                                            lesson.type === 'LISTENING' ? 'headphones' :
                                                                                lesson.type === 'SPEAKING' ? 'mic' :
                                                                                    lesson.type === 'WRITING' ? 'edit' : 'quiz'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <p className={`text-xs font-bold ${isDone ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                        {lesson.type}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                                                                        {lesson.title}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {isDone ? (
                                                                <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                                                            ) : (
                                                                <span className="material-symbols-outlined text-primary text-lg">play_circle</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {topics.length === 0 && (
                                <div className="text-center p-10 text-slate-500 bg-white dark:bg-[#1c1f27] rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">topic</span>
                                    <p className="font-medium">No hay temáticas disponibles aún.</p>
                                    <p className="text-xs opacity-60">Estamos actualizando tu contenido.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            {/* Floating Action Button */}
            {topics.length > 0 && (
                <button
                    onClick={() => {
                        const firstIncomplete = allLessons.find(l => !progressMap[l.id]);
                        if (firstIncomplete) navigate(`/lesson/${firstIncomplete.id}`);
                    }}
                    className="fixed bottom-24 right-6 size-14 bg-primary text-white rounded-full shadow-2xl shadow-primary/50 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
                >
                    <span className="material-symbols-outlined text-3xl">play_arrow</span>
                </button>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-6 pb-8 pt-3 z-50">
                <div className="flex justify-between items-center max-w-md mx-auto">
                    <a className="flex flex-col items-center gap-1 text-primary cursor-pointer">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Ruta</span>
                    </a>
                    <a onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-slate-400 cursor-pointer hover:text-slate-500">
                        <span className="material-symbols-outlined">leaderboard</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Progreso</span>
                    </a>
                    <div className="relative -top-6 opacity-0 pointer-events-none">
                        <button className="size-14 bg-primary text-white rounded-full shadow-xl">
                            <span className="material-symbols-outlined text-3xl">add</span>
                        </button>
                    </div>
                    <a className="flex flex-col items-center gap-1 text-slate-400 cursor-pointer">
                        <span className="material-symbols-outlined">group</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Comunidad</span>
                    </a>
                    <a className="flex flex-col items-center gap-1 text-slate-400 cursor-pointer">
                        <span className="material-symbols-outlined">person</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Perfil</span>
                    </a>
                </div>
            </nav>
        </div>
    );
};

export default LearningPath;
