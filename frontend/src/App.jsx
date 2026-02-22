import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LearningPath from './pages/LearningPath';
import LessonDetail from './pages/LessonDetail';
import PlacementTest from './pages/PlacementTest';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/learning-path" element={<LearningPath />} />
                <Route path="/lesson/:id" element={<LessonDetail />} />
                <Route path="/placement-test" element={<PlacementTest />} />
            </Routes>
        </Router>
    )
}

export default App
