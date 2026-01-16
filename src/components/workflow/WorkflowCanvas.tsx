import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Plus,
  Save,
  RotateCcw,
} from 'lucide-react';
import StateNode, { type StateNodeData } from './StateNode';
import TransitionEdge, { type TransitionEdgeData } from './TransitionEdge';
import type { WorkflowState, WorkflowTransition } from '../../types';
import { Button } from '../ui';

interface WorkflowCanvasProps {
  workflowId: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  canvasLayout?: string;
  onStateAdd: () => void;
  onStateEdit: (state: WorkflowState) => void;
  onStateDelete: (stateId: string) => void;
  onStatePositionChange?: (stateId: string, x: number, y: number) => void;
  onTransitionAdd: (fromStateId: string, toStateId: string) => void;
  onTransitionEdit: (transition: WorkflowTransition) => void;
  onTransitionDelete: (transitionId: string) => void;
  onTransitionConfigure: (transition: WorkflowTransition) => void;
  onLayoutSave?: (layout: string) => void;
}

const nodeTypes = {
  stateNode: StateNode,
};

const edgeTypes = {
  transitionEdge: TransitionEdge,
};

const defaultEdgeOptions = {
  type: 'transitionEdge',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: '#94a3b8',
  },
};

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  states,
  transitions,
  canvasLayout,
  onStateAdd,
  onStateEdit,
  onStateDelete,
  onStatePositionChange,
  onTransitionAdd,
  onTransitionEdit,
  onTransitionConfigure,
  onLayoutSave,
}) => {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  // Parse stored layout positions
  const layoutPositions = useMemo(() => {
    if (!canvasLayout) return {};
    try {
      return JSON.parse(canvasLayout);
    } catch {
      return {};
    }
  }, [canvasLayout]);

  // Convert states to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    return states.map((state, index) => {
      const storedPosition = layoutPositions[state.id];
      const defaultX = state.position_x ?? (150 + (index % 4) * 250);
      const defaultY = state.position_y ?? (100 + Math.floor(index / 4) * 150);

      return {
        id: state.id,
        type: 'stateNode',
        position: {
          x: storedPosition?.x ?? defaultX,
          y: storedPosition?.y ?? defaultY,
        },
        data: {
          id: state.id,
          name: state.name,
          code: state.code,
          state_type: state.state_type as 'initial' | 'normal' | 'terminal',
          color: state.color,
          sla_hours: state.sla_hours,
          description: state.description,
        } as StateNodeData,
      };
    });
  }, [states, layoutPositions]);

  // Convert transitions to React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    return transitions.map((transition) => ({
      id: transition.id,
      source: transition.from_state_id,
      target: transition.to_state_id,
      type: 'transitionEdge',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#94a3b8',
      },
      data: {
        id: transition.id,
        name: transition.name,
        code: transition.code,
        hasRequirements: (transition.requirements?.length || 0) > 0,
        hasActions: (transition.actions?.length || 0) > 0,
        allowedRolesCount: transition.allowed_roles?.length || 0,
      } as TransitionEdgeData,
    }));
  }, [transitions]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes when states change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Sync edges when transitions change
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Handle new connections (creating transitions)
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && connection.source !== connection.target) {
        // Check if transition already exists
        const exists = transitions.some(
          (t) => t.from_state_id === connection.source && t.to_state_id === connection.target
        );
        if (!exists) {
          onTransitionAdd(connection.source, connection.target);
        }
      }
    },
    [transitions, onTransitionAdd]
  );

  // Handle node position changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      // Update position in backend when drag ends
      changes.forEach((change) => {
        if (change.type === 'position' && !change.dragging && change.position) {
          onStatePositionChange?.(change.id, change.position.x, change.position.y);
        }
      });
    },
    [onNodesChange, onStatePositionChange]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // Handle node click
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
      setSelectedEdge(null);
    },
    []
  );

  // Handle edge click
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge);
      setSelectedNode(null);
    },
    []
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // Handle node double-click for editing
  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const state = states.find((s) => s.id === node.id);
      if (state) {
        onStateEdit(state);
      }
    },
    [states, onStateEdit]
  );

  // Handle edge double-click for editing
  const onEdgeDoubleClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const transition = transitions.find((t) => t.id === edge.id);
      if (transition) {
        onTransitionEdit(transition);
      }
    },
    [transitions, onTransitionEdit]
  );

  // Save current layout
  const saveLayout = useCallback(() => {
    const layout: Record<string, { x: number; y: number }> = {};
    nodes.forEach((node) => {
      layout[node.id] = { x: node.position.x, y: node.position.y };
    });
    onLayoutSave?.(JSON.stringify(layout));
  }, [nodes, onLayoutSave]);

  // Auto-arrange nodes
  const autoArrange = useCallback(() => {
    // Find initial states
    const initialStates = states.filter((s) => s.state_type === 'initial');
    const terminalStates = states.filter((s) => s.state_type === 'terminal');
    const normalStates = states.filter((s) => s.state_type === 'normal');

    const arranged: Record<string, { x: number; y: number }> = {};
    let currentY = 100;

    // Initial states at top
    initialStates.forEach((state, i) => {
      arranged[state.id] = { x: 150 + i * 300, y: currentY };
    });
    currentY += 150;

    // Normal states in middle rows
    normalStates.forEach((state, i) => {
      arranged[state.id] = { x: 150 + (i % 3) * 250, y: currentY + Math.floor(i / 3) * 150 };
    });
    if (normalStates.length > 0) {
      currentY += Math.ceil(normalStates.length / 3) * 150;
    }

    // Terminal states at bottom
    terminalStates.forEach((state, i) => {
      arranged[state.id] = { x: 150 + i * 300, y: currentY };
    });

    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        position: arranged[node.id] || node.position,
      }))
    );
  }, [states, setNodes]);

  // Get selected state/transition for sidebar
  const selectedState = selectedNode ? states.find((s) => s.id === selectedNode.id) : null;
  const selectedTransition = selectedEdge ? transitions.find((t) => t.id === selectedEdge.id) : null;

  return (
    <div className="h-[600px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode={null}
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as StateNodeData;
            return data?.color || '#6366f1';
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
          className="!bg-white !border-slate-200"
        />

        {/* Toolbar Panel */}
        <Panel position="top-left" className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onStateAdd}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add State
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={autoArrange}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Auto Arrange
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={saveLayout}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Layout
          </Button>
        </Panel>

        {/* Selection Panel */}
        {(selectedState || selectedTransition) && (
          <Panel position="top-right" className="w-64">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
              {selectedState && (
                <>
                  <h4 className="font-semibold text-slate-800 mb-3">Selected State</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: selectedState.color }}
                      />
                      <span className="font-medium text-slate-700">{selectedState.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">{selectedState.code}</p>
                    <p className="text-xs text-slate-500 capitalize">Type: {selectedState.state_type}</p>
                    {selectedState.sla_hours && (
                      <p className="text-xs text-slate-500">SLA: {selectedState.sla_hours}h</p>
                    )}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStateEdit(selectedState)}
                        className="flex-1"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onStateDelete(selectedState.id)}
                        className="flex-1"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </>
              )}
              {selectedTransition && (
                <>
                  <h4 className="font-semibold text-slate-800 mb-3">Selected Transition</h4>
                  <div className="space-y-2">
                    <span className="font-medium text-slate-700">{selectedTransition.name}</span>
                    <p className="text-xs text-slate-500 font-mono">{selectedTransition.code}</p>
                    <div className="flex items-center gap-1 text-xs">
                      <span
                        className="px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: states.find((s) => s.id === selectedTransition.from_state_id)?.color || '#6b7280' }}
                      >
                        {states.find((s) => s.id === selectedTransition.from_state_id)?.name || 'Unknown'}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span
                        className="px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: states.find((s) => s.id === selectedTransition.to_state_id)?.color || '#6b7280' }}
                      >
                        {states.find((s) => s.id === selectedTransition.to_state_id)?.name || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 text-xs">
                      {(selectedTransition.requirements?.length || 0) > 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {selectedTransition.requirements?.length} req
                        </span>
                      )}
                      {(selectedTransition.actions?.length || 0) > 0 && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                          {selectedTransition.actions?.length} actions
                        </span>
                      )}
                      {(selectedTransition.allowed_roles?.length || 0) > 0 && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                          {selectedTransition.allowed_roles?.length} roles
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onTransitionEdit(selectedTransition)}
                        className="flex-1"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onTransitionConfigure(selectedTransition)}
                        className="flex-1"
                      >
                        Configure
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Panel>
        )}

        {/* Help Panel */}
        <Panel position="bottom-left">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-500 border border-slate-200">
            <span className="font-medium">Tips:</span> Double-click to edit • Drag between nodes to create transitions • Drag nodes to reposition
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default WorkflowCanvas;
