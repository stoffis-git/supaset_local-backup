import React, { useState, useEffect } from 'react';
import { Exercise } from '../types';
import { useApp } from '../contexts/AppContext';
import { Card, CardBody } from './ui';
import { Checkbox } from './ui/Checkbox.tsx';
import { ArrowUpDown, Users } from 'lucide-react';
import { generateWorkout } from '../utils/workoutGenerator';

interface ExerciseListProps {
  exercises: Exercise[];
  workoutHistory: any;
}

const PAGE_SIZE = 20; // Number of exercises per page

const ExerciseList: React.FC<ExerciseListProps> = ({ exercises, workoutHistory }) => {
  const { state, dispatch } = useApp();
  const [sortMode, setSortMode] = useState<'alpha' | 'active'>('alpha');
  const [activeExercises, setActiveExercises] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isTogglingEnabled, setIsTogglingEnabled] = useState<boolean>(true);

  useEffect(() => {
    // Load active exercises from local storage
    const storedActiveExercises = localStorage.getItem('activeExercises');
    if (storedActiveExercises) {
      setActiveExercises(JSON.parse(storedActiveExercises));
    }
  }, []);

  const getDaysSinceLastPerformed = (exerciseId: string): number => {
    const completedWorkouts = Object.values(state.workouts).filter(w => w.completed);
    const lastPerformed = completedWorkouts
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .find(workout => 
        workout.exercises.some(ex => ex.exercise.exercise_id === exerciseId)
      );
    if (!lastPerformed) return 0;
    const lastDate = new Date(lastPerformed.date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getTimesPerformed = (exerciseId: string): number => {
    const completedWorkouts = Object.values(state.workouts).filter(w => w.completed);
    return completedWorkouts.reduce((count, workout) => {
      return count + workout.exercises.filter(ex => ex.exercise.exercise_id === exerciseId).length;
    }, 0);
  };

  const handleToggleActive = (exerciseId: string) => {
    if (!isTogglingEnabled) return;

    const newActiveExercises = activeExercises.includes(exerciseId)
      ? activeExercises.filter(id => id !== exerciseId)
      : [...activeExercises, exerciseId];

    setActiveExercises(newActiveExercises);
    localStorage.setItem('activeExercises', JSON.stringify(newActiveExercises));

    dispatch({
      type: 'TOGGLE_EXERCISE_ACTIVE',
      payload: exerciseId
    });
  };

  const toggleToggling = () => {
    setIsTogglingEnabled(prev => !prev);
    if (!isTogglingEnabled) {
      updateDatabaseWithActiveExercises(activeExercises);
    }
  };

  // Call generateWorkout with activeExercises
  const workout = generateWorkout(workoutHistory, activeExercises);

  // Sorting logic
  const isActive = (id: string) => activeExercises.includes(id);
  let sortedExercises: Exercise[] = [];
  let inactiveExercises: Exercise[] = [];

  if (sortMode === 'alpha') {
    sortedExercises = [...exercises].sort((a, b) => a.name.localeCompare(b.name));
  } else {
    const active = exercises.filter(ex => isActive(ex.exercise_id)).sort((a, b) => a.name.localeCompare(b.name));
    inactiveExercises = exercises.filter(ex => !isActive(ex.exercise_id)).sort((a, b) => a.name.localeCompare(b.name));
    sortedExercises = active;
  }

  const paginatedExercises = sortedExercises.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-dark-200">Exercises</span>
        <button
          className="flex items-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          onClick={() => setSortMode(sortMode === 'alpha' ? 'active' : 'alpha')}
        >
          Sort: {sortMode === 'alpha' ? 'A–Z' : 'Active First'}
          <ArrowUpDown size={16} className="ml-1" />
        </button>
      </div>
      <div className="space-y-2 transition-all duration-300">
        {paginatedExercises.map(exercise => {
          const daysSince = getDaysSinceLastPerformed(exercise.exercise_id);
          const timesPerformed = getTimesPerformed(exercise.exercise_id);
          const details = `${daysSince === 0 ? 'Never' : daysSince + 'd'} • ${timesPerformed}×`;
          return (
            <Card
              key={exercise.exercise_id}
              className={`w-full transition-all duration-300 ${!isActive(exercise.exercise_id) && sortMode === 'active' ? 'opacity-0 h-0 p-0 m-0 overflow-hidden' : 'opacity-100'}`}
            >
              <CardBody className="py-2 px-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium text-white truncate">
                        {exercise.name}
                      </h3>
                      <span className="text-xs text-dark-300 ml-2 whitespace-nowrap">{details}</span>
                    </div>
                  </div>
                  <Checkbox
                    checked={isActive(exercise.exercise_id)}
                    onCheckedChange={() => handleToggleActive(exercise.exercise_id)}
                    className="ml-3"
                  />
                </div>
              </CardBody>
            </Card>
          );
        })}
        {sortMode === 'active' && inactiveExercises.length > 0 && (
          <>
            <div className="relative flex items-center my-12 px-4">
              <div className="flex-grow border-t border-dark-700"></div>
              <span className="absolute left-1/2 -translate-x-1/2 bg-dark-900 px-3 text-xs text-dark-400" style={{top: '-0.7em'}}>
                Inactive
              </span>
              <div className="flex-grow border-t border-dark-700"></div>
            </div>
            {inactiveExercises.map(exercise => {
              const daysSince = getDaysSinceLastPerformed(exercise.exercise_id);
              const timesPerformed = getTimesPerformed(exercise.exercise_id);
              const details = `${daysSince === 0 ? 'Never' : daysSince + 'd'} • ${timesPerformed}×`;
              return (
                <Card
                  key={exercise.exercise_id}
                  className="w-full transition-all duration-300 opacity-100"
                >
                  <CardBody className="py-2 px-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-medium text-white truncate">
                            {exercise.name}
                          </h3>
                          <span className="text-xs text-dark-300 ml-2 whitespace-nowrap">{details}</span>
                        </div>
                      </div>
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => handleToggleActive(exercise.exercise_id)}
                        className="ml-3"
                      />
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </>
        )}
      </div>
      <div className="pagination">
        <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 0))} disabled={currentPage === 0}>
          Previous
        </button>
        <button onClick={() => setCurrentPage(prev => (prev + 1) * PAGE_SIZE < sortedExercises.length ? prev + 1 : prev)} disabled={(currentPage + 1) * PAGE_SIZE >= sortedExercises.length}>
          Next
        </button>
      </div>
    </div>
  );
};

export default ExerciseList; 