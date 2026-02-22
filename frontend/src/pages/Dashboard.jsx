import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardData } from '../services/api';

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, community, profile
    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                const dashboardData = await fetchDashboardData();

                // If the user hasn't completed the placement test, redirect them
                if (dashboardData.profile && !dashboardData.profile.has_completed_placement_test) {
                    navigate('/placement-test');
                    return;
                }

                setData(dashboardData);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">Loading...</div>;
    if (!data) return <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">Error loading data.</div>;

    const { profile, stats } = data;
    const username = profile.user.first_name || profile.user.username;

    const levelLabels = {
        'A1': 'Beginner',
        'A2': 'Basic',
        'B1': 'Intermediate',
        'B2': 'Upper Intermediate',
        'C1': 'Advanced'
    };

    const renderDashboard = () => (
        <>
            {/* Header / Profile Section */}
            <header className="px-6 pt-8 pb-6 bg-background-light dark:bg-background-dark">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-full border-2 border-primary p-0.5">
                            <div
                                className="size-full rounded-full bg-cover bg-center bg-gray-300"
                                style={{ backgroundImage: `url('${profile.profile_picture_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuDQ-L08k6zMdzbMuxGCNfIUJfS7GI5Tsh1x7T7i-58Fa4CaljZ_KNH-3hmAy_DNtbCURW38LUOhKHAj4Goa2cwoOgboDQ7kgJEfhPf_P15uGYNxut-qMyOxerHbmz-_x_CDByS6e-gUytki0AeerDqxvEB3vF9C61AlkSPoCxHrG0c1jvCLa62z1Ud4bSGHaKeSqsf1DHVySTk4NjwF_J1eSWnyiOXydXgIiUNAYY-XNnvdTvGu1Kut-YjaCKN9mjNKhNcNro03IN0"}')` }}
                            ></div>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Hola, {username}</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">¡Sigue así! Estás cerca del siguiente nivel.</p>
                        </div>
                    </div>
                    <button className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-outlined text-primary">notifications</span>
                    </button>
                </div>

                {/* Main Progress Card */}
                <div className="bg-primary rounded-xl p-6 relative overflow-hidden shadow-lg shadow-primary/20">
                    <div className="relative z-10">
                        <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">Nivel Actual</p>
                        <h2 className="text-3xl font-extrabold text-white mb-4 tracking-tight">
                            {profile.level} <span className="text-lg font-medium opacity-80">{levelLabels[profile.level] || 'Intermediate'}</span>
                        </h2>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-white transition-all duration-1000" style={{ width: `${stats.level_progress}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-white">{stats.level_progress}%</span>
                        </div>
                        <p className="text-xs text-white/70">
                            {stats.lessons_missing > 0
                                ? `Faltan ${stats.lessons_missing} lecciones para alcanzar el siguiente nivel`
                                : '¡Has completado todas las lecciones de este nivel!'}
                        </p>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute -right-4 -bottom-4 size-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute right-8 top-4 size-16 bg-white/5 rounded-full border border-white/10"></div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-6 space-y-8 pb-32">
                {/* The 4 Pillars Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold">Tus 4 Pilares</h3>
                        <span className="text-primary text-xs font-semibold cursor-pointer hover:underline" onClick={() => navigate('/learning-path')}>Ver todo</span>
                    </div>
                    <div className="space-y-5">
                        {/* Reading */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">auto_stories</span>
                                    <span className="text-sm font-medium">Reading (Lectura)</span>
                                </div>
                                <span className="text-xs font-bold">{profile.progress_reading}%</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${profile.progress_reading}%` }}></div>
                            </div>
                        </div>
                        {/* Listening */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-400 text-lg">headset</span>
                                    <span className="text-sm font-medium">Listening (Escucha)</span>
                                </div>
                                <span className="text-xs font-bold text-orange-400">{profile.progress_listening}%</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-400 rounded-full transition-all duration-700" style={{ width: `${profile.progress_listening}%` }}></div>
                            </div>
                        </div>
                        {/* Speaking */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-400 text-lg">record_voice_over</span>
                                    <span className="text-sm font-medium">Speaking (Habla)</span>
                                </div>
                                <span className="text-xs font-bold">{profile.progress_speaking}%</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${profile.progress_speaking}%` }}></div>
                            </div>
                        </div>
                        {/* Writing */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-purple-400 text-lg">edit_note</span>
                                    <span className="text-sm font-medium">Writing (Escritura)</span>
                                </div>
                                <span className="text-xs font-bold">{profile.progress_writing}%</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-400 rounded-full transition-all duration-700" style={{ width: `${profile.progress_writing}%` }}></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Recommended Lessons Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold">Tus Próximos Desafíos</h3>
                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">auto_awesome</span> Basado en tu progreso
                        </span>
                    </div>

                    {data.recommended_lessons && data.recommended_lessons.length > 0 ? (
                        <div className="space-y-6">
                            {Array.from(new Set(data.recommended_lessons.map(l => l.topic_title || 'General'))).map(topicTitle => (
                                <div key={topicTitle} className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{topicTitle}</p>
                                    <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar snap-x">
                                        {data.recommended_lessons.filter(l => (l.topic_title || 'General') === topicTitle).map((lesson) => (
                                            <div
                                                key={lesson.id}
                                                onClick={() => navigate(`/lesson/${lesson.id}`)}
                                                className="min-w-[240px] snap-start bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${lesson.type === 'READING' ? 'bg-blue-100 text-blue-600' :
                                                        lesson.type === 'LISTENING' ? 'bg-orange-100 text-orange-600' :
                                                            lesson.type === 'SPEAKING' ? 'bg-emerald-100 text-emerald-600' :
                                                                lesson.type === 'WRITING' ? 'bg-purple-100 text-purple-600' : 'bg-red-100 text-red-600'
                                                        }`}>
                                                        {lesson.type}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-slate-800 dark:text-white mb-2 group-hover:text-primary transition-colors line-clamp-1">{lesson.title}</h4>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                                                        Empezar <span className="material-symbols-outlined text-xs">play_arrow</span>
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-8 border border-dashed border-slate-300 dark:border-slate-700 text-center">
                            <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">done_all</span>
                            <p className="text-sm text-slate-500 italic">¡Increíble! Has completado todas las recomendaciones actuales.</p>
                        </div>
                    )}
                </section>

                {/* Stats Grid */}
                <section className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center">
                        <span className="material-symbols-outlined text-orange-500 mb-2 font-variation-FILL">local_fire_department</span>
                        <span className="text-2xl font-bold leading-none">{stats.streak}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Días de racha</span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center">
                        <span className="material-symbols-outlined text-primary mb-2">schedule</span>
                        <span className="text-2xl font-bold leading-none">{stats.total_hours}h</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Tiempo total</span>
                    </div>
                </section>
            </main>
        </>
    );

    const renderCommunity = () => (
        <main className="flex-1 px-6 pt-8 space-y-8 pb-32">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">groups</span> Comunidad
            </h2>

            <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                <h3 className="text-lg font-bold mb-4">🏆 Leaderboard Semanal</h3>
                <div className="space-y-4">
                    {[
                        { name: 'Ricardo', level: 'B2', points: 1250, rank: 1, avatar: profile.profile_picture_url },
                        { name: 'Ana M.', level: 'B1', points: 980, rank: 2 },
                        { name: 'Carlos P.', level: 'A2', points: 850, rank: 3 },
                        { name: 'Lucía F.', level: 'B2', points: 720, rank: 4 },
                    ].map((user, idx) => (
                        <div key={idx} className={`flex items-center gap-4 p-3 rounded-xl bg-white dark:bg-slate-800 border ${user.name === 'Ricardo' ? 'border-primary ring-1 ring-primary/20 shadow-lg' : 'border-slate-100 dark:border-slate-700'}`}>
                            <span className={`text-sm font-black w-4 ${user.rank === 1 ? 'text-yellow-500' : 'text-slate-400'}`}>{user.rank}</span>
                            <div className="size-10 rounded-full bg-slate-200 overflow-hidden">
                                {user.avatar ? <img src={user.avatar} className="size-full object-cover" /> : <div className="size-full flex items-center justify-center text-xs font-bold text-slate-400">{user.name[0]}</div>}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold">{user.name}</h4>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{user.level} LEVEL</span>
                            </div>
                            <span className="text-sm font-black text-primary">{user.points} XP</span>
                        </div>
                    ))}
                </div>
            </div>

            <section className="space-y-4">
                <h3 className="text-lg font-bold">Actividad Reciente</h3>
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="size-1 w-1 bg-slate-200 dark:bg-slate-800 rounded-full h-12"></div>
                        <div>
                            <p className="text-sm"><span className="font-bold">Ana M.</span> completó una lección de <span className="text-primary font-medium">Reading</span></p>
                            <span className="text-xs text-slate-400 tracking-tight">Hace 2 minutos</span>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );

    const renderProfile = () => (
        <main className="flex-1 px-6 pt-8 space-y-8 pb-32">
            <h2 className="text-2xl font-bold">Mi Perfil</h2>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center">
                <div className="size-24 rounded-full border-4 border-primary p-1 mx-auto mb-4">
                    <div
                        className="size-full rounded-full bg-cover bg-center bg-gray-300"
                        style={{ backgroundImage: `url('${profile.profile_picture_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuDQ-L08k6zMdzbMuxGCNfIUJfS7GI5Tsh1x7T7i-58Fa4CaljZ_KNH-3hmAy_DNtbCURW38LUOhKHAj4Goa2cwoOgboDQ7kgJEfhPf_P15uGYNxut-qMyOxerHbmz-_x_CDByS6e-gUytki0AeerDqxvEB3vF9C61AlkSPoCxHrG0c1jvCLa62z1Ud4bSGHaKeSqsf1DHVySTk4NjwF_J1eSWnyiOXydXgIiUNAYY-XNnvdTvGu1Kut-YjaCKN9mjNKhNcNro03IN0"}')` }}
                    ></div>
                </div>
                <h3 className="text-xl font-bold">{username}</h3>
                <p className="text-sm text-slate-500 mb-6">{profile.user.email}</p>

                <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Idioma Base</span>
                        <span className="font-bold">Español</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Nivel Actual</span>
                        <span className="font-bold text-primary">{profile.level}</span>
                    </div>
                </div>
            </div>

            <section className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-400">settings</span>
                        <span className="font-semibold text-sm">Configuración</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-400">help</span>
                        <span className="font-semibold text-sm">Ayuda y Soporte</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-colors">
                    <span className="material-symbols-outlined">logout</span>
                    <span className="text-sm">Cerrar Sesión</span>
                </button>
            </section>
        </main>
    );

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen flex flex-col font-display">

            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'community' && renderCommunity()}
            {activeTab === 'profile' && renderProfile()}

            {/* Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-6 pb-8 pt-3 z-50">
                <div className="flex justify-between items-center max-w-md mx-auto">
                    <button
                        onClick={() => navigate('/learning-path')}
                        className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined">menu_book</span>
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Lecciones</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-primary' : 'text-slate-400'}`}
                    >
                        <span className={`material-symbols-outlined ${activeTab === 'dashboard' ? 'font-variation-FILL' : ''}`}>leaderboard</span>
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Progreso</span>
                    </button>

                    <div className="relative -top-6">
                        <button
                            onClick={() => navigate('/learning-path')}
                            className="size-14 bg-primary text-white rounded-full shadow-xl shadow-primary/30 flex items-center justify-center ring-4 ring-white dark:ring-background-dark hover:scale-105 transition-transform"
                        >
                            <span className="material-symbols-outlined text-3xl">add</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setActiveTab('community')}
                        className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'community' ? 'text-primary' : 'text-slate-400'}`}
                    >
                        <span className={`material-symbols-outlined ${activeTab === 'community' ? 'font-variation-FILL' : ''}`}>group</span>
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Comunidad</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-primary' : 'text-slate-400'}`}
                    >
                        <span className={`material-symbols-outlined ${activeTab === 'profile' ? 'font-variation-FILL' : ''}`}>person</span>
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Perfil</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default Dashboard;
