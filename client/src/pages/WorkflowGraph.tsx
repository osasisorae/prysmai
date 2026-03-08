/**
 * Workflow Graph — Phase 2
 *
 * Directed graph visualization showing node-to-node execution flow
 * for agent sessions. Renders the trace tree as an interactive graph
 * with nodes for LLM calls, tool calls, decisions, and delegations.
 *
 * Uses pure SVG rendering (no external graph library dependency).
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  Wrench,
  GitBranch,
  Lightbulb,
  AlertTriangle,
  FileText,
  Code,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
} from "lucide-react";

interface WorkflowGraphProps {
  projectId: number;
}

// ─── Types ───

interface TreeNode {
  id: string;
  type: string;
  label: string;
  timestamp: number;
  durationMs?: number | null;
  success?: boolean | null;
  children: TreeNode[];
  metadata?: Record<string, unknown>;
}

interface LayoutNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  success?: boolean | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown>;
}

interface LayoutEdge {
  from: string;
  to: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

// ─── Constants ───

const NODE_WIDTH = 200;
const NODE_HEIGHT = 56;
const H_GAP = 40;
const V_GAP = 24;
const PADDING = 40;

// ─── Node Colors ───

function nodeStyle(type: string, success?: boolean | null) {
  const base: Record<string, { fill: string; stroke: string; text: string; icon: string }> = {
    agent_run: { fill: "#1a1a2e", stroke: "#6366f1", text: "#e0e0ff", icon: "#818cf8" },
    llm_call: { fill: "#1a1a2e", stroke: "#8b5cf6", text: "#e0e0ff", icon: "#a78bfa" },
    tool_call: { fill: "#1a1a2e", stroke: "#06b6d4", text: "#e0e0ff", icon: "#22d3ee" },
    decision: { fill: "#1a1a2e", stroke: "#f59e0b", text: "#e0e0ff", icon: "#fbbf24" },
    delegation: { fill: "#1a1a2e", stroke: "#3b82f6", text: "#e0e0ff", icon: "#60a5fa" },
    code: { fill: "#1a1a2e", stroke: "#10b981", text: "#e0e0ff", icon: "#34d399" },
    file_op: { fill: "#1a1a2e", stroke: "#6b7280", text: "#e0e0ff", icon: "#9ca3af" },
    error: { fill: "#1a1a2e", stroke: "#ef4444", text: "#e0e0ff", icon: "#f87171" },
    other: { fill: "#1a1a2e", stroke: "#6b7280", text: "#e0e0ff", icon: "#9ca3af" },
  };

  const style = base[type] || base.other;

  // Override stroke for failed nodes
  if (success === false) {
    return { ...style, stroke: "#ef4444" };
  }

  return style;
}

function nodeIcon(type: string) {
  switch (type) {
    case "agent_run": return "▶";
    case "llm_call": return "🧠";
    case "tool_call": return "🔧";
    case "decision": return "💡";
    case "delegation": return "⑂";
    case "code": return "⟨⟩";
    case "file_op": return "📄";
    case "error": return "⚠";
    default: return "•";
  }
}

// ─── Layout Algorithm ───

function layoutTree(root: TreeNode): { nodes: LayoutNode[]; edges: LayoutEdge[]; width: number; height: number } {
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  // Flatten children into a vertical list with the root at top
  const allNodes = [root, ...root.children];

  // Calculate positions: root centered at top, children flow vertically
  const totalHeight = allNodes.length * (NODE_HEIGHT + V_GAP) - V_GAP + PADDING * 2;
  const maxWidth = NODE_WIDTH + PADDING * 2;

  allNodes.forEach((node, idx) => {
    const x = PADDING;
    const y = PADDING + idx * (NODE_HEIGHT + V_GAP);

    nodes.push({
      id: node.id,
      type: node.type,
      label: node.label.length > 28 ? node.label.slice(0, 26) + "…" : node.label,
      x,
      y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      success: node.success,
      durationMs: node.durationMs,
      metadata: node.metadata,
    });

    // Edge from previous node to this one
    if (idx > 0) {
      const prev = nodes[idx - 1];
      edges.push({
        from: prev.id,
        to: node.id,
        fromX: prev.x + NODE_WIDTH / 2,
        fromY: prev.y + NODE_HEIGHT,
        toX: x + NODE_WIDTH / 2,
        toY: y,
      });
    }
  });

  return { nodes, edges, width: maxWidth, height: totalHeight };
}

// ─── SVG Graph Component ───

function GraphSVG({
  nodes,
  edges,
  width,
  height,
  selectedNode,
  onSelectNode,
}: {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
  selectedNode: string | null;
  onSelectNode: (id: string | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.3, Math.min(3, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return (
    <div className="relative">
      {/* Zoom Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom((z) => Math.min(3, z + 0.2))}>
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}>
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={resetView}>
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>
        <span className="text-[10px] text-muted-foreground ml-1">{Math.round(zoom * 100)}%</span>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height={Math.min(600, Math.max(300, height * zoom + 40))}
        className="cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#4b5563" />
          </marker>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {edges.map((edge) => (
            <g key={`${edge.from}-${edge.to}`}>
              <line
                x1={edge.fromX}
                y1={edge.fromY}
                x2={edge.toX}
                y2={edge.toY}
                stroke="#4b5563"
                strokeWidth={1.5}
                markerEnd="url(#arrowhead)"
                opacity={0.6}
              />
            </g>
          ))}

          {/* Nodes */}
          {nodes.map((node) => {
            const style = nodeStyle(node.type, node.success);
            const isSelected = selectedNode === node.id;

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => onSelectNode(isSelected ? null : node.id)}
              >
                {/* Node background */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={8}
                  fill={style.fill}
                  stroke={isSelected ? "#fff" : style.stroke}
                  strokeWidth={isSelected ? 2 : 1.5}
                  opacity={isSelected ? 1 : 0.9}
                />

                {/* Icon */}
                <text
                  x={node.x + 14}
                  y={node.y + NODE_HEIGHT / 2 + 1}
                  fill={style.icon}
                  fontSize={14}
                  dominantBaseline="middle"
                >
                  {nodeIcon(node.type)}
                </text>

                {/* Label */}
                <text
                  x={node.x + 34}
                  y={node.y + 22}
                  fill={style.text}
                  fontSize={11}
                  fontWeight={500}
                  fontFamily="var(--font-display), system-ui"
                >
                  {node.label}
                </text>

                {/* Duration */}
                {node.durationMs != null && (
                  <text
                    x={node.x + 34}
                    y={node.y + 40}
                    fill="#9ca3af"
                    fontSize={10}
                  >
                    {node.durationMs < 1000 ? `${node.durationMs}ms` : `${(node.durationMs / 1000).toFixed(1)}s`}
                  </text>
                )}

                {/* Success/Failure indicator */}
                {node.success != null && (
                  <circle
                    cx={node.x + node.width - 14}
                    cy={node.y + NODE_HEIGHT / 2}
                    r={4}
                    fill={node.success ? "#22c55e" : "#ef4444"}
                  />
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// ─── Main Component ───

export default function WorkflowGraph({ projectId }: WorkflowGraphProps) {
  const [sessionId, setSessionId] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // List sessions
  const sessionsQuery = trpc.governance.listSessions.useQuery(
    { projectId, limit: 20 },
    { staleTime: 30_000 }
  );

  // Get trace tree for selected session
  const treeQuery = trpc.unifiedTrace.getTraceTree.useQuery(
    { projectId, sessionId },
    { enabled: !!sessionId, staleTime: 30_000, retry: false }
  );

  const sessions = sessionsQuery.data?.sessions ?? [];
  const tree = treeQuery.data;

  // Layout the graph
  const layout = useMemo(() => {
    if (!tree) return null;
    return layoutTree(tree);
  }, [tree]);

  // Find selected node details
  const selectedNodeData = useMemo(() => {
    if (!layout || !selectedNode) return null;
    return layout.nodes.find((n) => n.id === selectedNode) ?? null;
  }, [layout, selectedNode]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Workflow Graph
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Directed execution graph showing node-to-node flow for agent sessions
        </p>
      </div>

      {/* Session Selector */}
      <Card className="bg-card/50 border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Select Session</label>
              <div className="flex gap-2 flex-wrap">
                {sessions.length === 0 && !sessionsQuery.isLoading && (
                  <p className="text-sm text-muted-foreground">No sessions found.</p>
                )}
                {sessionsQuery.isLoading && <Skeleton className="h-8 w-48" />}
                {sessions.slice(0, 8).map((s) => (
                  <Button
                    key={s.sessionId}
                    variant={sessionId === s.sessionId ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setSessionId(s.sessionId);
                      setSelectedNode(null);
                    }}
                  >
                    <span className="truncate max-w-[120px]">{s.agentType}</span>
                    <Badge variant="outline" className="ml-1.5 text-[10px]">
                      {s.status}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No session */}
      {!sessionId && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <GitBranch className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Select a session to view its execution graph</p>
          <p className="text-sm mt-1">Each node represents an LLM call, tool call, or decision</p>
        </div>
      )}

      {/* Graph */}
      {sessionId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graph Canvas */}
          <div className="lg:col-span-2">
            <Card className="bg-card/50 border-border overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-primary" />
                  Execution Graph
                  {layout && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      {layout.nodes.length} nodes · {layout.edges.length} edges
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {treeQuery.isLoading && (
                  <div className="h-64 flex items-center justify-center">
                    <Skeleton className="h-48 w-48 rounded-lg" />
                  </div>
                )}
                {treeQuery.isError && (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                    Failed to load trace tree
                  </div>
                )}
                {layout && (
                  <GraphSVG
                    nodes={layout.nodes}
                    edges={layout.edges}
                    width={layout.width}
                    height={layout.height}
                    selectedNode={selectedNode}
                    onSelectNode={setSelectedNode}
                  />
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {[
                { type: "agent_run", label: "Agent Run", color: "#6366f1" },
                { type: "llm_call", label: "LLM Call", color: "#8b5cf6" },
                { type: "tool_call", label: "Tool Call", color: "#06b6d4" },
                { type: "decision", label: "Decision", color: "#f59e0b" },
                { type: "delegation", label: "Delegation", color: "#3b82f6" },
                { type: "code", label: "Code", color: "#10b981" },
                { type: "error", label: "Error", color: "#ef4444" },
              ].map((item) => (
                <div key={item.type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color, opacity: 0.7 }} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Node Detail Panel */}
          <div>
            <Card className="bg-card/50 border-border sticky top-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Node Detail
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedNodeData ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <p>Click a node in the graph to inspect it</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Badge
                        variant="outline"
                        className="text-xs mb-2"
                        style={{
                          borderColor: nodeStyle(selectedNodeData.type, selectedNodeData.success).stroke,
                          color: nodeStyle(selectedNodeData.type, selectedNodeData.success).icon,
                        }}
                      >
                        {selectedNodeData.type.replace("_", " ")}
                      </Badge>
                      <p className="text-sm font-medium">{selectedNodeData.label}</p>
                    </div>

                    {selectedNodeData.durationMs != null && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Duration:{" "}
                        {selectedNodeData.durationMs < 1000
                          ? `${selectedNodeData.durationMs}ms`
                          : `${(selectedNodeData.durationMs / 1000).toFixed(1)}s`}
                      </div>
                    )}

                    {selectedNodeData.success != null && (
                      <div className="flex items-center gap-2 text-xs">
                        {selectedNodeData.success ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-green-400">Success</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-red-400" />
                            <span className="text-red-400">Failed</span>
                          </>
                        )}
                      </div>
                    )}

                    {selectedNodeData.metadata && Object.keys(selectedNodeData.metadata).length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Metadata</p>
                        <div className="space-y-1">
                          {Object.entries(selectedNodeData.metadata).map(([key, value]) => {
                            if (value == null) return null;
                            const display =
                              typeof value === "object"
                                ? JSON.stringify(value).slice(0, 100)
                                : String(value).slice(0, 100);
                            return (
                              <div key={key} className="flex justify-between text-xs py-0.5">
                                <span className="text-muted-foreground">{key}</span>
                                <span className="text-foreground tabular-nums truncate max-w-[120px]" title={display}>
                                  {display}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
