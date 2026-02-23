import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchLessonDetails, completeLesson, evaluateWriting } from '../services/api';

const LessonDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [evaluating, setEvaluating] = useState(false); // New state for AI evaluation
    const [writingFeedback, setWritingFeedback] = useState(null); // New state for feedback
    // Store answers for multiple questions: { [index]: "Selected Option" }
    const [userAnswers, setUserAnswers] = useState({});
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);

    // Speaking State
    const [recordingIndex, setRecordingIndex] = useState(null);
    const [speakingAnswers, setSpeakingAnswers] = useState({});
    const [speakingFeedback, setSpeakingFeedback] = useState({});
    const [speakingScores, setSpeakingScores] = useState({});
    // Vocabulary State
    const [vocabList, setVocabList] = useState([]);
    const [vocabDefinitions, setVocabDefinitions] = useState(null);
    const [vocabQuiz, setVocabQuiz] = useState(null);
    const [vocabQuizAnswers, setVocabQuizAnswers] = useState({});
    const [vocabQuizSubmitted, setVocabQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState(0);
    const [showVocabModule, setShowVocabModule] = useState(false); // To toggle module visibility

    // Audio & Interaction State
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [showSpeakingFeedback, setShowSpeakingFeedback] = useState({});
    const audioRef = useRef(null);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    setIsPlaying(true);
                }).catch(error => {
                    console.error("Audio playback interrupted/failed:", error);
                    setIsPlaying(false);
                });
            }
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const maxDuration = 60; // Limit to 1 minute as requested

            if (current >= maxDuration) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                setIsPlaying(false);
                setAudioProgress(100);
            } else {
                setAudioProgress((current / maxDuration) * 100);
            }
        }
    };

    const formatTime = (time) => {
        if (!time && time !== 0) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const recognitionRef = React.useRef(null);

    const toggleRecording = (idx) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert("Your browser does not support Speech Recognition. Please use Chrome or Edge.");
            return;
        }

        if (recordingIndex === idx) {
            // STOP Recording
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            setRecordingIndex(null);

            // Trigger Evaluation
            const text = speakingAnswers[idx];
            if (text && text.length > 2) {
                handleSpeechEvaluation(text, idx);
            } else {
                // No text captured
                alert("No speech detected. Please try again.");
            }

        } else if (recordingIndex !== null) {
            alert("Please stop the current recording first.");
        } else {
            // START Recording
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US'; // Default to English for lessons

            recognition.onstart = () => {
                setRecordingIndex(idx);
            };

            recognition.onresult = (event) => {
                const fullTranscript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');

                // Update specific answer
                setSpeakingAnswers(prev => ({
                    ...prev,
                    [idx]: fullTranscript
                }));
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    alert("Microphone access denied. Please allow microphone access.");
                }
                setRecordingIndex(null);
            };

            recognition.onend = () => {
                // If stopped naturally (silence), ensure state is cleared
                // But we manually control stop usually.
                if (recordingIndex === idx) {
                    // Only clear if it wasn't manual stop
                    // actually typically we want manual stop to be the main driver
                }
            };

            recognitionRef.current = recognition;
            recognition.start();
        }
    };

    const handleSpeechEvaluation = async (text, idx) => {
        setEvaluating(true);
        // Show simulated feedback while loading or just wait?
        // Let's set a loading state for this specific speech block if possible
        // For now using global evaluating state which dims the screen/button

        try {
            const promptContext = lesson.content_json?.questions?.[idx]?.question || "General speaking practice";
            const response = await evaluateWriting(text, promptContext, 'speaking');

            setSpeakingFeedback(prev => ({
                ...prev,
                [idx]: response.feedback
            }));

            setSpeakingScores(prev => ({
                ...prev,
                [idx]: response.score
            }));

            setShowSpeakingFeedback(prev => ({
                ...prev,
                [idx]: true
            }));

        } catch (e) {
            console.error("Speech eval failed", e);
            alert(`Speech Eval Error: ${e.message || "Unknown error"}`);
        } finally {
            setEvaluating(false);
        }
    };

    const handleVocabReview = async () => {
        if (vocabList.length === 0) return;
        setEvaluating(true);
        try {
            const data = await evaluateWriting(vocabList.join(', '), 'Vocabulary Definitions', 'vocabulary');
            let defs = [];
            try {
                // If backend returns object directly (DRF Parser) or string
                defs = typeof data.feedback === 'string' ? JSON.parse(data.feedback) : data.feedback;
            } catch (e) {
                console.error("JSON Parse error", e);
            }
            setVocabDefinitions(Array.isArray(defs) ? defs : []);
        } catch (e) {
            alert("Error generating vocabulary: " + e.message);
        } finally {
            setEvaluating(false);
        }
    };

    const handleVocabQuiz = async () => {
        if (vocabList.length === 0) return;
        setEvaluating(true);
        try {
            const data = await evaluateWriting(vocabList.join(', '), 'Vocabulary Quiz', 'vocab_quiz');
            let quiz = [];
            try {
                quiz = typeof data.feedback === 'string' ? JSON.parse(data.feedback) : data.feedback;
            } catch (e) {
                console.error("JSON Parse error", e);
            }
            setVocabQuiz(Array.isArray(quiz) ? quiz : []);
            setVocabQuizSubmitted(false);
            setVocabQuizAnswers({});
        } catch (e) {
            alert("Error generating quiz: " + e.message);
        } finally {
            setEvaluating(false);
        }
    };

    useEffect(() => {
        const loadLesson = async () => {
            try {
                const data = await fetchLessonDetails(id);
                setLesson(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadLesson();
    }, [id]);

    const handleOptionSelect = (questionIndex, option) => {
        if (showResult) return;
        setUserAnswers(prev => ({
            ...prev,
            [questionIndex]: option
        }));
    };

    const handleCheck = async () => {
        if (!lesson) return;

        let correctCount = 0;
        const questions = lesson.content_json?.questions || [];

        // If it's the old single-question format (fallback)
        const singleQuestionBlock = lesson.content_json?.blocks?.find(b => b.type === 'question');

        if (lesson.type === 'WRITING') {
            setEvaluating(true);
            try {
                const response = await evaluateWriting(userAnswers['writing_text'], lesson.content_json?.prompt);
                setScore(response.score || 10);
                setWritingFeedback(response.feedback);
            } catch (e) {
                console.error("Evaluation failed", e);
                setScore(10); // Fallback
            } finally {
                setEvaluating(false);
            }
        } else if (lesson.type === 'SPEAKING') {
            // For speaking, if they recorded answers, give full score
            setScore(questions.length);
        } else if (questions.length > 0) {
            questions.forEach((q, idx) => {
                if (userAnswers[idx] === q.answer) {
                    correctCount++;
                }
            });
            setScore(correctCount);
        } else if (singleQuestionBlock) {
            // For single question backward compatibility
            if (userAnswers[0] === singleQuestionBlock.answer) {
                setScore(1);
            }
        }

        setShowResult(true);
    };

    const handleContinue = async () => {
        try {
            await completeLesson(lesson.id, score);
        } catch (error) {
            console.error("Failed to save progress:", error);
        }
        navigate('/learning-path');
    };

    if (loading) return <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center text-white">Loading...</div>;
    if (!lesson) return <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center text-white">Lesson not found.</div>;

    const content = lesson.content_json || {};
    // Extract textual content for Reading
    const blocks = content.blocks || [];
    const textBlock = blocks.find(b => b.type === 'text') || { content: "No text content available." };

    // Determine questions based on format (Array of questions OR single block)
    const questions = content.questions || [];
    const singleQuestionBlock = blocks.find(b => b.type === 'question');
    if (!questions.length && singleQuestionBlock) {
        questions.push(singleQuestionBlock);
    }

    const isQuiz = questions.length > 0 && lesson.type !== 'WRITING' && lesson.type !== 'SPEAKING';
    const allAnswered = isQuiz && questions.every((_, idx) => userAnswers[idx]);

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen flex flex-col font-display">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-4 h-16">
                    <button onClick={() => navigate('/learning-path')} className="flex items-center justify-center size-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                        <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">arrow_back_ios_new</span>
                    </button>
                    <div className="flex flex-col items-center flex-1">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">{lesson.type} • Level {lesson.level}</span>
                        <h1 className="text-sm font-bold text-slate-900 dark:text-white max-w-[200px] truncate">{lesson.title}</h1>
                    </div>
                    <button className="flex items-center justify-center size-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                        <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">more_horiz</span>
                    </button>
                </div>
                {/* Progress Bar */}
                <div className="px-6 pb-3">
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-3/4 rounded-full"></div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full custom-scrollbar pb-32">
                <div className="space-y-6">
                    {/* Header Image */}
                    <div className="relative h-40 w-full rounded-2xl overflow-hidden shadow-lg mb-8">
                        <img
                            alt="Lesson Topic"
                            className="w-full h-full object-cover"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUZ8jbLFSN5drHw8lfoSN3Hyr_N_88A773KqHarckrUF4W2LSJYrv8-zO8xreZsCZ2GDzA1zjx1CV-kddx5Esnw__Ao8cMaaqfq1uYlTXXeAxBkFdGDlzVytGk9heX6_u94PPVXnn1FPU4GLZrCbOezLVfcOsUHTKrJsRsf05F9Zd3JMa3NywISx5Esnw__Ao8cMaaqfq1uYlTXXeAxBkFdGDlzVytGk9heX6_u94PPVXnn1FPU4GLZrCbOezLVfcOsUHTKrJsRsf05F9Zd3JMa3NywISx5sq5_lpUPKj79dS3WAGjd5swCjQl5W2b3OBbTAqggF3Jp1aF3c_NZPwcqtghdIDXfsfM_TnQXOsyivWBMsrXI"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 to-transparent"></div>
                        <div className="absolute bottom-4 left-4">
                            <h2 className="text-xl font-bold text-white shadow-black/50 drop-shadow-md">{lesson.title}</h2>
                        </div>
                    </div>

                    {/* Dynamic Content based on Lesson Type */}

                    {/* READING Type */}
                    {lesson.type === 'READING' && (
                        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4 flex items-center gap-3 border border-blue-100 dark:border-blue-800">
                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">tips_and_updates</span>
                                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                                    Reading Tip: Tap on any unknown words to highlight them and add them to your vocabulary list.
                                </p>
                            </div>
                            <p className="text-lg leading-relaxed text-slate-800 dark:text-slate-200 text-justify">
                                {(() => {
                                    // Robust text extraction
                                    const textContent = content.content || content.text || (content.blocks && content.blocks.find(b => b.type === 'text')?.content) || "";

                                    if (!textContent) {
                                        return <span className="text-slate-500 italic block text-center py-8">No reading content available. {content ? `(Keys: ${Object.keys(content).join(', ')})` : '(Content undefined)'}</span>;
                                    }

                                    return textContent.split(/\s+/).map((word, i) => {
                                        const cleanWord = word.replace(/[^\w'-]/g, "").toLowerCase();
                                        const isSelected = vocabList.includes(cleanWord);
                                        return (
                                            <span
                                                key={i}
                                                className={`cursor-pointer rounded px-0.5 transition-all duration-200 ${isSelected ? 'bg-yellow-300 dark:bg-yellow-600 text-slate-900 font-bold shadow-sm' : 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30'}`}
                                                onClick={() => {
                                                    if (!cleanWord || cleanWord.length < 2) return;
                                                    setVocabList(prev =>
                                                        prev.includes(cleanWord)
                                                            ? prev.filter(w => w !== cleanWord)
                                                            : [...prev, cleanWord]
                                                    );
                                                }}
                                            >
                                                {word}{' '}
                                            </span>
                                        );
                                    });
                                })()}
                            </p>
                            {vocabList.length > 0 && (
                                <div className="mt-6 flex justify-end animate-fade-in-up">
                                    <button
                                        onClick={() => setShowVocabModule(true)}
                                        className="bg-indigo-600 text-white px-5 py-2 rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 font-bold hover:scale-105 active:scale-95"
                                    >
                                        <span className="material-symbols-outlined">menu_book</span>
                                        Open Vocabulary ({vocabList.length})
                                    </button>
                                </div>
                            )}
                        </div>
                    )}


                    {/* LISTENING Type */}
                    {lesson.type === 'LISTENING' && (
                        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center gap-4">
                            <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                                <span className="material-symbols-outlined text-5xl">headphones</span>
                            </div>
                            <h3 className="text-lg font-bold">Listen carefully</h3>

                            <audio
                                ref={audioRef}
                                src={content.audio_url}
                                onTimeUpdate={handleTimeUpdate}
                                onEnded={() => setIsPlaying(false)}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onError={(e) => console.error("Audio playback error:", e.nativeEvent)}
                            />

                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full p-2 flex items-center gap-2">
                                <button
                                    onClick={togglePlay}
                                    className="size-10 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-primary hover:scale-105 active:scale-95 transition-transform"
                                >
                                    <span className="material-symbols-outlined">
                                        {isPlaying ? 'pause' : 'play_arrow'}
                                    </span>
                                </button>
                                <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const percentage = x / rect.width;
                                    if (audioRef.current && audioRef.current.duration) {
                                        const newTime = percentage * audioRef.current.duration;
                                        audioRef.current.currentTime = newTime;
                                        setAudioProgress(percentage * 100);
                                    }
                                }}>
                                    <div
                                        className="h-full bg-primary transition-all duration-100 ease-linear"
                                        style={{ width: `${audioProgress}%` }}
                                    ></div>
                                </div>
                                <span className="text-xs font-mono text-slate-500">
                                    {audioRef.current ? formatTime(audioRef.current.currentTime) : '0:00'} / {audioRef.current && audioRef.current.duration ? formatTime(audioRef.current.duration) : '0:00'}
                                </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 italic text-center mt-2">
                                "{content.word || content.context || 'Audio content'}"
                            </p>
                        </div>
                    )}

                    {/* WRITING Type */}
                    {lesson.type === 'WRITING' && (
                        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">edit_note</span>
                                Writing Task
                            </h3>
                            <p className="text-slate-700 dark:text-slate-300 mb-4 text-lg">
                                {content.prompt}
                            </p>
                            <div className="relative">
                                <textarea
                                    className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none text-slate-800 dark:text-slate-200"
                                    placeholder={content.placeholder || "Start typing..."}
                                    value={userAnswers['writing_text'] || ''}
                                    onChange={(e) => handleOptionSelect('writing_text', e.target.value)}
                                />
                                <div className="absolute bottom-4 right-4 text-xs text-slate-400 font-medium bg-white/80 dark:bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-slate-200 dark:border-slate-700">
                                    {(userAnswers['writing_text'] || '').split(/\s+/).filter(w => w.length > 0).length} / {content.min_words || 50} words
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SPEAKING Type */}
                    {lesson.type === 'SPEAKING' && (
                        <div className="space-y-6">
                            {(content.questions || []).map((q, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                    <h3 className="font-bold text-lg mb-2">Question {idx + 1}</h3>
                                    <p className="text-xl text-slate-800 dark:text-slate-200 mb-4">{q.text}</p>

                                    <div className="flex items-center gap-4">
                                        <button
                                            disabled={evaluating}
                                            onClick={() => toggleRecording(idx)}
                                            className={`size-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${recordingIndex === idx ? 'bg-red-500 text-white shadow-red-500/30 animate-pulse' : (evaluating ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-primary text-white shadow-primary/30 hover:bg-primary/90')}`}
                                        >
                                            <span className={`material-symbols-outlined text-2xl ${evaluating ? 'animate-spin' : ''}`}>
                                                {recordingIndex === idx ? 'stop' : (evaluating ? 'progress_activity' : (showSpeakingFeedback[idx] ? 'mic' : 'mic'))}
                                            </span>
                                        </button>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                {recordingIndex === idx ? 'Recording... tap to stop' : (evaluating ? (
                                                    <span className="text-blue-600 dark:text-blue-400 font-bold animate-pulse flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm">psychology</span>
                                                        AI Examiner is analyzing...
                                                    </span>
                                                ) : (showSpeakingFeedback[idx] ? 'Recorded' : 'Tap mic to answer'))}
                                            </p>
                                            {recordingIndex === idx && (
                                                <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                                                    <div className="h-full bg-red-500 animate-[width_1s_ease-in-out_infinite]" style={{ width: '50%' }}></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {speakingAnswers[idx] && (
                                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Your Answer:</p>
                                            <p className="text-slate-800 dark:text-slate-200 italic">"{speakingAnswers[idx]}"</p>
                                        </div>
                                    )}

                                    {speakingFeedback[idx] && (
                                        <div className="mt-4 animate-fade-in-up">
                                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 mb-3">
                                                <div className="flex items-start gap-3">
                                                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 mt-0.5">smart_toy</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="font-bold text-green-800 dark:text-green-300">AI Examiner Feedback</p>
                                                            <span className="px-2 py-0.5 bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 rounded text-xs font-bold">
                                                                Score: {speakingScores[idx] || '?'}/10
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-green-900 dark:text-green-200 whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                                                            {speakingFeedback[idx]}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Show Ideal Answer if available as extra help */}
                                            {q.ideal_answer && (
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                                                    <strong className="block text-slate-500 uppercase tracking-wider mb-1">Suggested Answer:</strong>
                                                    <p className="italic text-slate-600 dark:text-slate-400">"{q.ideal_answer}"</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {(!content.questions || content.questions.length === 0) && (
                                <div className="text-center p-8 text-slate-500">No speaking questions configured.</div>
                            )}
                        </div>
                    )}

                    {/* WRITING/QUIZ Questions */}
                    {isQuiz && lesson.type !== 'SPEAKING' && (
                        <div className="space-y-6">
                            {questions.map((q, idx) => (
                                <div key={idx} className={`bg-white dark:bg-slate-900/50 border rounded-2xl p-6 shadow-sm transition-colors ${showResult
                                    ? (userAnswers[idx] === q.answer ? 'border-green-500 bg-green-50/10' : 'border-red-500 bg-red-50/10')
                                    : 'border-slate-200 dark:border-slate-800'
                                    }`}>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-start gap-4">
                                        <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0 mt-1">
                                            {idx + 1}
                                        </div>
                                        {q.question}
                                    </h3>
                                    <div className="space-y-3">
                                        {q.options && q.options.map((option, oIdx) => {
                                            const isSelected = userAnswers[idx] === option;
                                            const isCorrect = option === q.answer;

                                            let containerClass = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700";
                                            let iconClass = "border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-600";
                                            let iconContent = String.fromCharCode(65 + oIdx);

                                            if (isSelected) {
                                                containerClass = "border-primary bg-primary/5 dark:bg-primary/10";
                                                iconClass = "bg-primary border-primary text-white";
                                            }

                                            if (showResult) {
                                                if (isCorrect) {
                                                    containerClass = "border-green-500 bg-green-100/20";
                                                    iconClass = "bg-green-500 border-green-500 text-white";
                                                    iconContent = <span className="material-symbols-outlined text-sm font-bold">check</span>;
                                                } else if (isSelected && !isCorrect) {
                                                    containerClass = "border-red-500 bg-red-100/20";
                                                    iconClass = "bg-red-500 border-red-500 text-white";
                                                    iconContent = <span className="material-symbols-outlined text-sm font-bold">close</span>;
                                                }
                                            }

                                            return (
                                                <button
                                                    key={oIdx}
                                                    onClick={() => handleOptionSelect(idx, option)}
                                                    className={`w-full flex items-center p-4 rounded-xl border-2 text-left transition-all ${containerClass}`}
                                                    disabled={showResult}
                                                >
                                                    <div className={`size-6 rounded-full border-2 flex items-center justify-center mr-3 ${iconClass}`}>
                                                        {typeof iconContent === 'string' ? <span className="text-[10px] font-bold">{iconContent}</span> : iconContent}
                                                    </div>
                                                    <span className="text-slate-700 dark:text-slate-300 font-medium">{option}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {showResult && (
                                        <div className={`mt-4 p-3 rounded-lg text-sm border ${userAnswers[idx] === q.answer
                                            ? 'bg-green-100 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
                                            : 'bg-red-100 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'}`}>
                                            <div className="flex gap-2">
                                                <span className="material-symbols-outlined text-lg">
                                                    {userAnswers[idx] === q.answer ? 'check_circle' : 'cancel'}
                                                </span>
                                                <div>
                                                    <p className="font-bold mb-1">
                                                        {userAnswers[idx] === q.answer ? 'Correct!' : 'Incorrect'}
                                                    </p>
                                                    {userAnswers[idx] !== q.answer && (
                                                        <p className="mb-1">Correct answer: <strong>{q.answer}</strong></p>
                                                    )}
                                                    {q.feedback && <p className="italic opacity-90">{q.feedback}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom Action Area */}
            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background-light dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 pb-8 z-50">
                <div className="max-w-lg mx-auto">
                    {!showResult ? (
                        <button
                            onClick={handleCheck}
                            // Quiz: answer all. Writing: min words. Speaking: answer all.
                            disabled={
                                (isQuiz && !allAnswered) ||
                                (lesson.type === 'WRITING' && (!userAnswers['writing_text'] || userAnswers['writing_text'].trim().length < 10)) ||
                                (lesson.type === 'SPEAKING' && questions.some((_, idx) => !speakingAnswers[idx])) ||
                                evaluating
                            }
                            className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${(isQuiz && !allAnswered) ||
                                (lesson.type === 'WRITING' && (!userAnswers['writing_text'] || userAnswers['writing_text'].trim().length < 10)) ||
                                (lesson.type === 'SPEAKING' && questions.some((_, idx) => !speakingAnswers[idx])) ||
                                evaluating
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : 'bg-primary text-white hover:bg-primary/90'
                                }`}
                        >
                            {evaluating ? 'Evaluating...' : (isQuiz ? 'Check Answers' : lesson.type === 'WRITING' ? 'Submit for Review' : 'Complete Lesson')}
                        </button>
                    ) : (
                        <div className="flex gap-4 items-center animate-slide-up w-full">
                            {isQuiz ? (
                                <div className="flex-1 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl flex items-center gap-4">
                                    <div className={`size-12 rounded-full flex items-center justify-center text-white font-bold text-xl ${(score / (questions.length || 1) >= 0.7) ? 'bg-green-500' : 'bg-yellow-500'
                                        }`}>
                                        {Math.round((score / (questions.length || 1)) * 100)}%
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">
                                            {(score / (questions.length || 1) >= 0.7) ? 'Great Job!' : 'Keep Practicing'}
                                        </h4>
                                        <p className="text-sm text-slate-500">You got {score} out of {questions.length} correct.</p>
                                    </div>
                                </div>
                            ) : lesson.type === 'WRITING' ? (
                                <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-start gap-3 text-blue-700 dark:text-blue-400 font-bold text-lg">
                                        <span className="material-symbols-outlined mt-1">edit_note</span>
                                        <div className="flex-1 min-w-0">
                                            <h4>Writing Evaluate!</h4>

                                            {/* User's Original Text */}
                                            <div className="mb-3">
                                                <strong className="block text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1">Your Submission:</strong>
                                                <div className="bg-white/80 dark:bg-black/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm italic text-slate-700 dark:text-slate-300 max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                                    {userAnswers['writing_text']}
                                                </div>
                                            </div>

                                            {writingFeedback ? (
                                                <div className="mt-2 text-sm font-normal text-slate-700 dark:text-slate-300">
                                                    <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/50 mb-2 max-h-60 overflow-y-auto custom-scrollbar">
                                                        <strong className="block text-blue-800 dark:text-blue-300 mb-1 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm py-1">AI Feedback:</strong>
                                                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{writingFeedback}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold">Score:</span>
                                                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">{score}/10</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm font-normal opacity-80">Great effort! Try to use more complex sentences next time.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                                    <div className="flex items-center gap-3 text-green-700 dark:text-green-400 font-bold text-lg">
                                        <span className="material-symbols-outlined">check_circle</span>
                                        Lesson Completed!
                                    </div>
                                </div>
                            )}

                            <button onClick={handleContinue} className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 ml-auto">
                                Continue
                            </button>
                        </div>
                    )}
                </div>
            </footer>

            {/* Vocabulary Module Modal */}
            {showVocabModule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">menu_book</span>
                                Vocabulary Builder
                            </h3>
                            <button onClick={() => setShowVocabModule(false)} className="size-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {!vocabDefinitions && !vocabQuiz ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-slate-700 dark:text-slate-300">My Word List ({vocabList.length})</h4>
                                        <button
                                            onClick={() => setVocabList([])}
                                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                                        >
                                            Clear All
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {vocabList.map((word, i) => (
                                            <span key={i} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium border border-indigo-100 dark:border-indigo-800 flex items-center gap-2 group">
                                                {word}
                                                <button
                                                    onClick={() => setVocabList(prev => prev.filter(w => w !== word))}
                                                    className="size-4 rounded-full hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors opacity-50 group-hover:opacity-100"
                                                >
                                                    <span className="material-symbols-outlined text-[10px]">close</span>
                                                </button>
                                            </span>
                                        ))}
                                        {vocabList.length === 0 && (
                                            <p className="text-slate-400 italic text-sm">No words highlighted yet. Go back to Reading to select words.</p>
                                        )}
                                    </div>

                                    {vocabList.length > 0 && (
                                        <div className="grid grid-cols-2 gap-4 mt-8">
                                            <button
                                                onClick={handleVocabReview}
                                                disabled={evaluating}
                                                className="bg-indigo-600 text-white p-4 rounded-xl shadow hover:bg-indigo-700 flex flex-col items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <span className={`material-symbols-outlined text-3xl ${evaluating ? 'animate-spin' : ''}`}>{evaluating ? 'sync' : 'school'}</span>
                                                <span className="font-bold">Generate Definitions</span>
                                                <span className="text-xs opacity-80">Learn meanings & examples</span>
                                            </button>

                                            <button
                                                onClick={handleVocabQuiz}
                                                disabled={evaluating}
                                                className="bg-purple-600 text-white p-4 rounded-xl shadow hover:bg-purple-700 flex flex-col items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <span className={`material-symbols-outlined text-3xl ${evaluating ? 'animate-spin' : ''}`}>{evaluating ? 'sync' : 'quiz'}</span>
                                                <span className="font-bold">Take Quiz</span>
                                                <span className="text-xs opacity-80">Test your knowledge</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : vocabDefinitions ? (
                                <div className="space-y-4 animate-fade-in">
                                    <button onClick={() => setVocabDefinitions(null)} className="text-sm text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 mb-4 hover:underline">
                                        <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Selection
                                    </button>

                                    {vocabDefinitions.length > 0 ? (
                                        <div className="space-y-4">
                                            {vocabDefinitions.map((item, idx) => (
                                                <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <h5 className="font-bold text-lg text-indigo-700 dark:text-indigo-400 capitalize mb-1">{item.word}</h5>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                                                        <span className="font-bold opacity-70">Def:</span> {item.definition}
                                                    </p>
                                                    <div className="text-sm bg-white dark:bg-black/20 p-2 rounded-lg italic text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                                        "{item.example}"
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10">
                                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">sentiment_dissatisfied</span>
                                            <p className="text-slate-500">The AI examiner didn't return any definitions. Please try selecting the words again.</p>
                                        </div>
                                    )}
                                </div>
                            ) : vocabQuiz ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <button onClick={() => { setVocabQuiz(null); setVocabQuizSubmitted(false); }} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">arrow_back</span> Quit Quiz
                                        </button>
                                        {vocabQuizSubmitted && (
                                            <span className="font-bold text-green-600 bg-green-100 px-3 py-1 rounded-lg">Score: {quizScore}/{vocabQuiz.length}</span>
                                        )}
                                    </div>

                                    {vocabQuiz.length > 0 ? (
                                        <>
                                            {vocabQuiz.map((q, idx) => (
                                                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
                                                    <p className="font-bold mb-4 flex gap-2">
                                                        <span className="size-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs shrink-0">{idx + 1}</span>
                                                        {q.question}
                                                    </p>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {q.options.map((opt, oIdx) => {
                                                            const isSelected = vocabQuizAnswers[idx] === opt;
                                                            const isCorrect = q.correct_answer === opt;
                                                            let btnClass = "text-left p-3 rounded-lg border transition-all ";

                                                            if (vocabQuizSubmitted) {
                                                                if (isCorrect) btnClass += "bg-green-100 border-green-500 text-green-800";
                                                                else if (isSelected) btnClass += "bg-red-100 border-red-500 text-red-800";
                                                                else btnClass += "bg-slate-50 border-slate-200 opacity-50";
                                                            } else {
                                                                if (isSelected) btnClass += "bg-purple-50 border-purple-500 text-purple-900";
                                                                else btnClass += "bg-slate-50 border-slate-200 hover:bg-slate-100";
                                                            }

                                                            return (
                                                                <button
                                                                    key={oIdx}
                                                                    onClick={() => !vocabQuizSubmitted && setVocabQuizAnswers(prev => ({ ...prev, [idx]: opt }))}
                                                                    className={btnClass}
                                                                    disabled={vocabQuizSubmitted}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <div className="text-center py-10">
                                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">quiz</span>
                                            <p className="text-slate-500">Could not generate a quiz for these words. Try different words.</p>
                                        </div>
                                    )}

                                    {!vocabQuizSubmitted ? (
                                        <button
                                            onClick={() => {
                                                setVocabQuizSubmitted(true);
                                                // Calculate score
                                                let s = 0;
                                                vocabQuiz.forEach((q, i) => {
                                                    if (vocabQuizAnswers[i] === q.correct_answer) s++;
                                                });
                                                setQuizScore(s);
                                            }}
                                            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow hover:bg-green-700"
                                            disabled={Object.keys(vocabQuizAnswers).length < vocabQuiz.length}
                                        >
                                            Check Answers
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => { setVocabQuiz(null); setVocabQuizSubmitted(false); }}
                                            className="w-full bg-slate-200 text-slate-800 py-3 rounded-xl font-bold hover:bg-slate-300"
                                        >
                                            Finish Quiz
                                        </button>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonDetail;
