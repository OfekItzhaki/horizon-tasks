import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import ListsPage from './pages/ListsPage';
import TasksPage from './pages/TasksPage';
import TaskDetailsPage from './pages/TaskDetailsPage';
import ProfilePage from './pages/ProfilePage';
import AnalyticsPage from './pages/AnalyticsPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/auth/verify-email/:token"
            element={<VerifyEmailPage />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/lists" replace />} />
            <Route path="lists" element={<ListsPage />} />
            <Route path="lists/:listId/tasks" element={<TasksPage />} />
            <Route path="tasks/:taskId" element={<TaskDetailsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
