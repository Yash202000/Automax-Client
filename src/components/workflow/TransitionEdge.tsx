import { memo } from 'react';
import {
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  type EdgeProps,
} from '@xyflow/react';

export interface TransitionEdgeData extends Record<string, unknown> {
  id: string;
  name: string;
  code: string;
  hasRequirements?: boolean;
  hasActions?: boolean;
  allowedRolesCount?: number;
}

function TransitionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as TransitionEdgeData | undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? '#3b82f6' : '#94a3b8',
          strokeWidth: selected ? 2 : 1.5,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div
            className={`
              px-2 py-1 rounded-lg bg-white shadow-md border text-xs font-medium
              cursor-pointer transition-all hover:shadow-lg
              ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}
            `}
          >
            <span className="text-gray-700">{edgeData?.name || 'Transition'}</span>
            {/* Indicators */}
            <div className="flex items-center gap-1 mt-1">
              {edgeData?.hasRequirements && (
                <span className="w-2 h-2 rounded-full bg-blue-500" title="Has requirements" />
              )}
              {edgeData?.hasActions && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Has actions" />
              )}
              {edgeData?.allowedRolesCount && edgeData.allowedRolesCount > 0 && (
                <span className="text-[10px] text-gray-500">
                  {edgeData.allowedRolesCount} role{edgeData.allowedRolesCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(TransitionEdge);
