import React, { useMemo } from 'react';
import { ChevronRight, Circle, Play, Flag } from 'lucide-react';
import type { Workflow, WorkflowState } from '../../types';

interface MiniWorkflowViewProps {
  workflow: Workflow;
  currentStateId?: string;
  onStateClick?: (state: WorkflowState) => void;
}

export const MiniWorkflowView: React.FC<MiniWorkflowViewProps> = ({
  workflow,
  currentStateId,
  onStateClick,
}) => {
  const states = workflow.states || [];
  const transitions = workflow.transitions || [];

  // Group states by type and sort
  const { initialStates, normalStates, terminalStates } = useMemo(() => {
    return {
      initialStates: states.filter((s) => s.state_type === 'initial'),
      normalStates: states.filter((s) => s.state_type === 'normal'),
      terminalStates: states.filter((s) => s.state_type === 'terminal'),
    };
  }, [states]);

  // Build transition map for visual connections
  const transitionMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    transitions.forEach((t) => {
      if (!map[t.from_state_id]) {
        map[t.from_state_id] = [];
      }
      map[t.from_state_id].push(t.to_state_id);
    });
    return map;
  }, [transitions]);

  // Check if a state can be reached from current state
  const getReachableStates = (fromStateId: string): Set<string> => {
    const reachable = new Set<string>();
    const directTransitions = transitionMap[fromStateId] || [];
    directTransitions.forEach((id) => reachable.add(id));
    return reachable;
  };

  const reachableFromCurrent = currentStateId ? getReachableStates(currentStateId) : new Set<string>();

  const getStateIcon = (stateType: string) => {
    switch (stateType) {
      case 'initial':
        return <Play className="w-3 h-3" />;
      case 'terminal':
        return <Flag className="w-3 h-3" />;
      default:
        return <Circle className="w-3 h-3" />;
    }
  };

  const renderState = (state: WorkflowState) => {
    const isCurrent = state.id === currentStateId;
    const isReachable = reachableFromCurrent.has(state.id);

    return (
      <div
        key={state.id}
        onClick={() => onStateClick?.(state)}
        className={`
          relative flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all cursor-pointer
          ${isCurrent
            ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg scale-105'
            : isReachable
              ? 'opacity-100 hover:scale-102'
              : 'opacity-50'
          }
          ${onStateClick ? 'hover:shadow-md' : ''}
        `}
        style={{
          borderColor: state.color,
          backgroundColor: isCurrent ? `${state.color}15` : 'white',
        }}
      >
        <div
          className="p-1 rounded"
          style={{ backgroundColor: `${state.color}20`, color: state.color }}
        >
          {getStateIcon(state.state_type)}
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-medium truncate ${isCurrent ? 'text-gray-900 dark:text-gray-300' : 'text-gray-700'}`}>
            {state.name}
          </p>
        </div>
        {isCurrent && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
        )}
      </div>
    );
  };

  const renderStateRow = (statesInRow: WorkflowState[], label: string) => {
    if (statesInRow.length === 0) return null;

    return (
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
          {label}
        </span>
        <div className="flex flex-wrap gap-2">
          {statesInRow.map(renderState)}
        </div>
      </div>
    );
  };

  if (states.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        No states configured in this workflow
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact linear view for simple workflows */}
      {states.length <= 5 ? (
        <div className="flex items-center gap-2 flex-wrap">
          {states
            .sort((a, b) => {
              // Sort: initial first, then normal, then terminal
              const order = { initial: 0, normal: 1, terminal: 2 };
              return (order[a.state_type as keyof typeof order] || 1) - (order[b.state_type as keyof typeof order] || 1);
            })
            .map((state, index) => (
              <React.Fragment key={state.id}>
                {renderState(state)}
                {index < states.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
        </div>
      ) : (
        /* Grouped view for complex workflows */
        <div className="space-y-4">
          {renderStateRow(initialStates, 'Start')}
          {renderStateRow(normalStates, 'In Progress')}
          {renderStateRow(terminalStates, 'End')}
        </div>
      )}

      {/* Current state indicator */}
      {currentStateId && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Current: <span className="font-medium text-gray-700 dark:text-gray-300">{states.find((s) => s.id === currentStateId)?.name}</span>
          </span>
          {reachableFromCurrent.size > 0 && (
            <span className="text-xs text-gray-400">
              • {reachableFromCurrent.size} possible next state{reachableFromCurrent.size > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MiniWorkflowView;
