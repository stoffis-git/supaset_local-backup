import React, { useState } from 'react';
import WorkoutTypeSelector from '../components/WorkoutTypeSelector';
import WorkoutDetail from '../components/WorkoutDetail';
import { useAppContext } from '../context/AppContext';
import { WorkoutType } from '../types';
import { Plus } from 'lucide-react';
import Button from '../components/ui/Button';

const WorkoutsPage: React.FC = () => {
  const { createWorkout, state } = useAppContext();
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  
  const handleCreateWorkout = (type: WorkoutType) => {
    const newWorkout = createWorkout(type);
    setSelectedWorkout(newWorkout.id);
    setShowSelector(false);
  };
  
  if (showSelector) {
    return (
      <div>
        <div className="mb-6">
          <button 
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
            onClick={() => setShowSelector(false)}
          >
            ← Back
          </button>
        </div>
        <WorkoutTypeSelector onSelect={handleCreateWorkout} />
      </div>
    );
  }
  
  if (selectedWorkout) {
    const workout = state.workouts[selectedWorkout];
    if (workout) {
      return (
        <WorkoutDetail 
          workout={workout} 
          onBack={() => setSelectedWorkout(null)} 
        />
      );
    }
  }
  
  // Organize workouts by date
  const workoutsByDate: Record<string, typeof state.workouts> = {};
  Object.values(state.workouts)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach(workout => {
      const date = new Date(workout.date).toLocaleDateString();
      if (!workoutsByDate[date]) {
        workoutsByDate[date] = {};
      }
      workoutsByDate[date][workout.id] = workout;
    });
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Workouts
        </h1>
        <Button 
          onClick={() => setShowSelector(true)}
          className="flex items-center"
        >
          <Plus size={18} className="mr-1" />
          New Workout
        </Button>
      </div>
      
      {Object.keys(workoutsByDate).length === 0 ? (
        <div className="text-center py-20">
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">
            No workouts yet
          </h3>
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500 mb-6">
            Create your first workout to start your fitness journey!
          </p>
          <Button 
            onClick={() => setShowSelector(true)}
            className="flex items-center mx-auto"
          >
            <Plus size={18} className="mr-1" />
            New Workout
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(workoutsByDate).map(([date, workouts]) => (
            <div key={date}>
              <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
                {date === new Date().toLocaleDateString() ? 'Today' : date}
              </h2>
              <div className="space-y-3">
                {Object.values(workouts).map(workout => (
                  <div 
                    key={workout.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-md"
                    onClick={() => setSelectedWorkout(workout.id)}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {workout.type.charAt(0).toUpperCase() + workout.type.slice(1)} Workout
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {workout.exercises.length} exercises
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {workout.completed ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            In Progress
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkoutsPage;