
const API_URL = 'https://englishbackend-wygz.onrender.com/api';

export const loginUser = async (username, password) => {
    try {
        const response = await fetch(`${API_URL}/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        return data;
    } catch (error) {
        console.error('Error logging in:', error);
        throw error;
    }
};

export const registerUser = async (fullName, username, password) => {
    try {
        const response = await fetch(`${API_URL}/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                password,
                email: username,
                first_name: fullName
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Registration failed');
        }

        const data = await response.json();
        // Auto-login after register
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        return data;
    } catch (error) {
        console.error('Error registering:', error);
        throw error;
    }
};

export const fetchDashboardData = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/dashboard/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
            throw new Error('Failed to fetch dashboard');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        throw error;
    }
};

export const fetchTopics = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/topics/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to fetch topics');
        return await response.json();
    } catch (error) {
        console.error('Error fetching topics:', error);
        throw error;
    }
};

export const fetchLessons = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/lessons/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to fetch lessons');
        return await response.json();
    } catch (error) {
        console.error('Error fetching lessons:', error);
        throw error;
    }
};

export const fetchUserProgress = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/progress/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to fetch user progress');
        return await response.json();
    } catch (error) {
        console.error('Error fetching user progress:', error);
        return []; // Return empty array on error to prevent crash
    }
};

export const fetchLessonDetails = async (id) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/lessons/${id}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to fetch lesson details');
        return await response.json();
    } catch (error) {
        console.error('Error fetching lesson details:', error);
        throw error;
    }
};

export const completeLesson = async (lessonId, score = 100) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/progress/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            },
            body: JSON.stringify({
                lesson: lessonId, // Some backends expect ID, some object. DRF ModelSerializer often expects ID.
                completed: true,
                score: score,
                completed_at: new Date().toISOString()
            })
        });

        // 201 Created or 200 OK
        if (!response.ok) throw new Error('Failed to save progress');
        return await response.json();
    } catch (error) {
        console.error('Error completing lesson:', error);
        throw error;
    }
};

export const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/login';
};

export const evaluateWriting = async (text, prompt, type = 'writing') => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/evaluate-writing/`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                prompt,
                submission_type: type
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.detail || `Server Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error evaluating writing:', error);
        throw error;
    }
};

export const generatePlacementTest = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/placement-test/generate/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to generate placement test');
        }
        return await response.json();
    } catch (error) {
        console.error('Error generating placement test:', error);
        throw error;
    }
};

export const evaluatePlacementTest = async (results) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');

        const response = await fetch(`${API_URL}/placement-test/evaluate/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            },
            body: JSON.stringify({ results })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to evaluate placement test');
        }
        return await response.json();
    } catch (error) {
        console.error('Error evaluating placement test:', error);
        throw error;
    }
};
