import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import AppLayout from './layouts/AppLayout';
import HomePage from './pages/HomePage';
import WorkoutPage from './pages/WorkoutPage';
import ExercisesPage from './pages/ExercisesPage';

function App() {
  return (
    <AppProvider>
      <Router>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/workout/:id" element={<WorkoutPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
          </Routes>
        </AppLayout>
      </Router>
    </AppProvider>
  );
}

export default App;