import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Circle, Play, Flag } from 'lucide-react';

export interface StateNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  code: string;
  state_type: 'initial' | 'normal' | 'terminal';
  color: string;
  sla_hours?: number;
  description?: string;
}

function StateNode({ data, selected }: NodeProps) {
  const nodeData = data as StateNodeData;

  const getStateIcon = () => {
    switch (nodeData.state_type) {
      case 'initial':
        return <Play className="w-4 h-4" />;
      case 'terminal':
        return <Flag className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getStateBorderStyle = () => {
    switch (nodeData.state_type) {
      case 'initial':
        return 'border-2 border-dashed';
      case 'terminal':
        return 'border-2';
      default:
        return 'border';
    }
  };

  return (
    <div
      className={`
        relative px-4 py-3 rounded-xl bg-white shadow-lg min-w-[140px] max-w-[200px]
        transition-all duration-200
        ${getStateBorderStyle()}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
      `}
      style={{
        borderColor: nodeData.color,
      }}
    >
      {/* Top handle for incoming transitions */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />

      {/* Left handle for incoming transitions */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />

      {/* State content */}
      <div className="flex items-center gap-2">
        <div
          className="p-1.5 rounded-lg"
          style={{ backgroundColor: `${nodeData.color}20`, color: nodeData.color }}
        >
          {getStateIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{nodeData.name}</p>
          <p className="text-xs text-gray-500 font-mono truncate">{nodeData.code}</p>
        </div>
      </div>

      {/* SLA indicator */}
      {nodeData.sla_hours && (
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
            SLA: {nodeData.sla_hours}h
          </span>
        </div>
      )}

      {/* State type badge */}
      {nodeData.state_type !== 'normal' && (
        <div
          className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded-full text-white"
          style={{ backgroundColor: nodeData.color }}
        >
          {nodeData.state_type === 'initial' ? 'Start' : 'End'}
        </div>
      )}

      {/* Right handle for outgoing transitions */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />

      {/* Bottom handle for outgoing transitions */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />
    </div>
  );
}

export default memo(StateNode);
