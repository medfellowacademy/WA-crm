"use client";

/**
 * Visual drag-and-drop canvas for a flow's node graph, built on
 * @xyflow/react. Positions persist to flow_nodes.position_x/position_y
 * (already supported by the PUT /api/flows/[id] route).
 *
 * This is a graph *view* of the same BuilderState the list editor
 * (flow-builder.tsx) owns — it doesn't duplicate the per-node config
 * forms. Clicking a node hands off to the list editor (expand + scroll)
 * so all editing stays in one place; the canvas is for seeing and
 * rewiring the shape of the flow at a glance.
 */

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeProps,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  MessageCircle,
  ListChecks,
  ListPlus,
  Inbox,
  GitFork,
  Tag,
  UserPlus,
  Flag,
  PlayCircle,
  CircleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CanvasNode {
  node_key: string;
  node_type: string;
  config: Record<string, unknown>;
  position_x?: number;
  position_y?: number;
}

interface FlowCanvasProps {
  nodes: CanvasNode[];
  entryNodeId: string | null;
  errorKeys: Set<string>;
  onNodeClick: (key: string) => void;
  onPositionChange: (key: string, x: number, y: number) => void;
}

const NODE_ICONS: Record<string, typeof MessageCircle> = {
  start: PlayCircle,
  send_message: MessageCircle,
  send_buttons: ListChecks,
  send_list: ListPlus,
  collect_input: Inbox,
  condition: GitFork,
  set_tag: Tag,
  handoff: UserPlus,
  end: Flag,
};

const NODE_COLORS: Record<string, string> = {
  start: "text-emerald-400 border-emerald-500/40",
  send_message: "text-sky-400 border-sky-500/40",
  send_buttons: "text-primary border-primary/40",
  send_list: "text-indigo-400 border-indigo-500/40",
  collect_input: "text-teal-400 border-teal-500/40",
  condition: "text-fuchsia-400 border-fuchsia-500/40",
  set_tag: "text-pink-400 border-pink-500/40",
  handoff: "text-amber-400 border-amber-500/40",
  end: "text-slate-400 border-slate-600",
};

/**
 * Extracts labeled edges (nodeKey -> nodeKey) from a node's config.
 * Mirrors the next_node_key / branch fields defined per node_type in
 * src/lib/flows/types.ts.
 */
export function extractEdges(nodes: CanvasNode[]): Edge[] {
  const keys = new Set(nodes.map((n) => n.node_key));
  const edges: Edge[] = [];
  const push = (from: string, to: unknown, id: string, label?: string, color?: string) => {
    if (typeof to !== "string" || !to || !keys.has(to)) return;
    edges.push({
      id,
      source: from,
      target: to,
      label,
      animated: false,
      style: color ? { stroke: color } : undefined,
      labelStyle: { fill: "#94a3b8", fontSize: 10 },
      labelBgStyle: { fill: "#0f172a" },
    });
  };

  for (const node of nodes) {
    const cfg = node.config as Record<string, unknown>;
    switch (node.node_type) {
      case "start":
      case "send_message":
      case "collect_input":
      case "set_tag":
        push(node.node_key, cfg.next_node_key, `${node.node_key}-next`);
        break;
      case "send_buttons": {
        const buttons = Array.isArray(cfg.buttons) ? cfg.buttons : [];
        buttons.forEach((b, i) => {
          const btn = b as { next_node_key?: string; title?: string };
          push(node.node_key, btn.next_node_key, `${node.node_key}-btn-${i}`, btn.title);
        });
        break;
      }
      case "send_list": {
        const sections = Array.isArray(cfg.sections) ? cfg.sections : [];
        sections.forEach((s, si) => {
          const rows = Array.isArray((s as { rows?: unknown[] }).rows)
            ? ((s as { rows: unknown[] }).rows)
            : [];
          rows.forEach((r, ri) => {
            const row = r as { next_node_key?: string; title?: string };
            push(node.node_key, row.next_node_key, `${node.node_key}-row-${si}-${ri}`, row.title);
          });
        });
        break;
      }
      case "condition":
        push(node.node_key, cfg.true_next, `${node.node_key}-true`, "Yes", "#34d399");
        push(node.node_key, cfg.false_next, `${node.node_key}-false`, "No", "#f87171");
        break;
      case "handoff":
      case "end":
        break;
    }
  }
  return edges;
}

function FlowGraphNode({ data }: NodeProps) {
  const d = data as unknown as {
    label: string;
    node_type: string;
    preview: string | null;
    isEntry: boolean;
    hasError: boolean;
  };
  const Icon = NODE_ICONS[d.node_type] ?? MessageCircle;
  const colorCls = NODE_COLORS[d.node_type] ?? "text-slate-400 border-slate-600";

  return (
    <div
      className={cn(
        "min-w-[180px] max-w-[220px] rounded-lg border bg-slate-900 px-3 py-2 shadow-md",
        d.hasError ? "border-red-500/50" : d.isEntry ? "border-primary/60" : "border-slate-700",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-600" />
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", colorCls.split(" ")[0])} />
        <span className="truncate text-xs font-medium text-white">{d.label}</span>
        {d.hasError && <CircleAlert className="h-3 w-3 shrink-0 text-red-400" />}
      </div>
      {d.preview && (
        <p className="mt-0.5 truncate text-[10px] text-slate-500">{d.preview}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-slate-600" />
    </div>
  );
}

const nodeTypes = { flowNode: FlowGraphNode };

export function FlowCanvas({
  nodes,
  entryNodeId,
  errorKeys,
  onNodeClick,
  onPositionChange,
}: FlowCanvasProps) {
  const rfNodes = useMemo<Node[]>(
    () =>
      nodes.map((n, i) => ({
        id: n.node_key,
        type: "flowNode",
        position: {
          x: n.position_x ?? (i % 4) * 260,
          y: n.position_y ?? Math.floor(i / 4) * 140,
        },
        data: {
          label: n.node_key,
          node_type: n.node_type,
          preview: null,
          isEntry: entryNodeId === n.node_key,
          hasError: errorKeys.has(n.node_key),
        },
      })),
    [nodes, entryNodeId, errorKeys],
  );

  const rfEdges = useMemo(() => extractEdges(nodes), [nodes]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        // Only persist once the drag ends — avoids a write per mousemove.
        if (change.type === "position" && change.position && change.dragging === false) {
          onPositionChange(change.id, Math.round(change.position.x), Math.round(change.position.y));
        }
      }
    },
    [onPositionChange],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onNodeClick={(_, node) => onNodeClick(node.id)}
        fitView
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
        <Controls />
        <MiniMap
          nodeColor={() => "#334155"}
          maskColor="rgba(15, 23, 42, 0.6)"
          className="!bg-slate-900"
        />
      </ReactFlow>
    </div>
  );
}
