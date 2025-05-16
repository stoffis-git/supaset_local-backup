import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardBody, Button } from '../components/ui';
import { Plus } from 'lucide-react';
import { generateWorkout } from '../utils/workoutGenerator';
import { useApp } from '../contexts/AppContext';
import { Workout } from '../types';
import WorkoutDetail from '../components/WorkoutDetail';

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HomePage() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [previewWorkout, setPreviewWorkout] = useState<Workout | null>(null);
  const [historyCount, setHistoryCount] = useState(5);
  const historyRef = useRef<HTMLDivElement>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [newWorkoutDisabled, setNewWorkoutDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);

  // Debounce logic: re-enable after 300ms if activeExercises changes
  useEffect(() => {
    setNewWorkoutDisabled(true);
    const timeout = setTimeout(() => setNewWorkoutDisabled(false), 300);
    return () => clearTimeout(timeout);
  }, [state.activeExercises]);

  const sortedWorkouts = Object.values(state.workouts)
    .filter(w => w.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Infinite scroll: load more when scrolled to bottom
  useEffect(() => {
    const handleScroll = () => {
      if (!historyRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = historyRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setHistoryCount(count => Math.min(count + 10, sortedWorkouts.length));
      }
    };
    const ref = historyRef.current;
    if (ref) ref.addEventListener('scroll', handleScroll);
    return () => { if (ref) ref.removeEventListener('scroll', handleScroll); };
  }, [sortedWorkouts.length]);

  useEffect(() => {
    if (error) {
      setErrorVisible(true);
      const timeout = setTimeout(() => setErrorVisible(false), 1500);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  const handleNewWorkout = () => {
    if (!state.activeExercises || state.activeExercises.length === 0) {
      setError('No active exercises selected. Please select at least one exercise in the Exercises tab.');
      return;
    }
    if (newWorkoutDisabled) return;
    setError(null);
    const newWorkout = generateWorkout(state.workouts, state.activeExercises);
    setPreviewWorkout(newWorkout);
  };

  const handleStartWorkout = () => {
    if (previewWorkout) {
      navigate(`/workout/${previewWorkout.id}`, { state: { workout: previewWorkout } });
    }
  };

  const handleClosePreview = () => {
    setPreviewWorkout(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-indigo-400">
          Supaset
        </h1>
      </div>

      {/* New Workout Tile */}
      <Card 
        className={`cursor-pointer hover:border-indigo-500 transition-colors ${(!state.activeExercises || state.activeExercises.length === 0 || newWorkoutDisabled) ? 'opacity-50' : ''}`}
        onClick={handleNewWorkout}
      >
        <CardBody>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Plus size={32} className="mx-auto mb-2 text-indigo-400" />
              <h2 className="text-xl font-semibold text-white">New Workout</h2>
              <p className="text-dark-400">Full Body</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Workout History Section */}
      <div>
        <h2 className="text-lg font-bold mb-2 text-dark-200">History</h2>
        <div
          ref={historyRef}
          className="max-h-96 overflow-y-auto space-y-2 pr-1"
          style={{ minHeight: 120 }}
        >
          {sortedWorkouts.slice(0, historyCount).map(workout => {
            const exerciseNames = workout.exercises.map(ex => ex.exercise.name);
            const shownNames = exerciseNames.slice(0, 3).join(', ');
            const more = exerciseNames.length > 3 ? '…' : '';
            return (
              <button
                key={workout.id}
                className="w-full text-left focus:outline-none"
                onClick={() => setSelectedWorkout(workout)}
              >
                <Card className="w-full p-0">
                  <CardBody className="flex flex-col py-2 px-3">
                    <span className="text-sm font-semibold text-indigo-300">
                      {formatDateTime(workout.date)}
                    </span>
                    <span className="text-xs text-dark-400 mt-1">
                      {shownNames}{more && `, ${more}`}
                    </span>
                  </CardBody>
                </Card>
              </button>
            );
          })}
          {sortedWorkouts.length === 0 && (
            <div className="text-dark-400 text-sm text-center py-6">No workouts yet.</div>
          )}
        </div>
      </div>

      {/* Workout Details Overlay */}
      {selectedWorkout && (
        <div className="fixed inset-0 bg-dark-900/90 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 rounded-lg p-4 max-w-lg w-full shadow-lg overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-indigo-300">{formatDateTime(selectedWorkout.date)}</h2>
              <Button variant="secondary" size="sm" onClick={() => setSelectedWorkout(null)}>
                Close
              </Button>
            </div>
            <div className="space-y-4">
              {selectedWorkout.exercises.map((ex, idx) => (
                <div key={ex.exercise.exercise_id} className="">
                  <div className="font-semibold text-sm text-white mb-1">
                    {idx + 1}. {ex.exercise.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ex.sets.map((set, sIdx) => (
                      <span
                        key={sIdx}
                        className="bg-dark-700 text-dark-200 rounded px-2 py-1 text-xs"
                      >
                        {set.weight} × {set.reps}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workout Preview Overlay */}
      {previewWorkout && (
  <div className="fixed inset-0 bg-dark-900/90 z-50 flex items-center justify-center p-4">
    <div className="bg-dark-800 rounded-lg p-6 max-w-lg w-full">
      <WorkoutDetail
        workout={previewWorkout}
        onBack={handleClosePreview}
        isPreview={true}
      />
    </div>
  </div>
)}

      {/* Error Message */}
      {error && (
        <div className={`bg-red-900 text-red-200 rounded px-4 py-2 mb-4 text-center transition-opacity duration-500 ${errorVisible ? 'opacity-100' : 'opacity-0'}`}>
          {error}
          <br />
          <Link to="/exercises" className="underline text-indigo-300">Go to Exercises</Link>
        </div>
      )}
    </div>
  );
}