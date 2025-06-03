"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GitBranch, Plus } from "lucide-react"

interface ConversationNode {
  id: string
  title: string
  messages: any[]
  children: ConversationNode[]
  createdAt?: Date
  x?: number
  y?: number
}

interface FlowchartTreeProps {
  conversationTree: ConversationNode
  currentBranch: string
  onSwitchBranch: (branchId: string) => void
  onCreateBranch: (messageIndex: number) => void
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 80
const LEVEL_HEIGHT = 140
const NODE_SPACING = 220

export function FlowchartTree({ conversationTree, currentBranch, onSwitchBranch, onCreateBranch }: FlowchartTreeProps) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate node positions with improved layout
  const calculatePositions = (
    node: ConversationNode,
    level = 0,
    siblingIndex = 0,
    totalSiblings = 1,
    parentX = 0,
  ): ConversationNode => {
    const centerX = dimensions.width / 2
    let x: number

    if (level === 0) {
      // Root node is centered
      x = centerX
    } else if (totalSiblings === 1) {
      // Single child is centered under parent
      x = parentX
    } else {
      // Multiple children are spread out
      const startX = parentX - ((totalSiblings - 1) * NODE_SPACING) / 2
      x = startX + siblingIndex * NODE_SPACING
    }

    const positioned = {
      ...node,
      x,
      y: 50 + level * LEVEL_HEIGHT,
      children: node.children.map((child, index) =>
        calculatePositions(child, level + 1, index, node.children.length, x),
      ),
    }

    return positioned
  }

  const positionedTree = calculatePositions(conversationTree)

  // Get all nodes for rendering
  const getAllNodes = (node: ConversationNode): ConversationNode[] => {
    return [node, ...node.children.flatMap((child) => getAllNodes(child))]
  }

  const allNodes = getAllNodes(positionedTree)

  // Get connections between nodes
  const getConnections = (node: ConversationNode): Array<{ from: ConversationNode; to: ConversationNode }> => {
    const connections: Array<{ from: ConversationNode; to: ConversationNode }> = []

    node.children.forEach((child) => {
      connections.push({ from: node, to: child })
      connections.push(...getConnections(child))
    })

    return connections
  }

  const connections = getConnections(positionedTree)

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width: Math.max(width, 800), height: Math.max(height, 600) })
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  const handleNodeClick = (nodeId: string) => {
    onSwitchBranch(nodeId)
  }

  const getNodeColor = (node: ConversationNode) => {
    if (node.id === currentBranch) {
      return "bg-primary text-primary-foreground border-primary shadow-md"
    }
    return "bg-card hover:bg-accent border-border hover:border-accent-foreground"
  }

  const getAIMessageCount = (messages: any[]) => {
    return messages.filter((msg) => msg.role === "assistant").length
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto bg-background">
      <div className="relative" style={{ width: dimensions.width, height: Math.max(dimensions.height, 400) }}>
        {/* SVG for connections */}
        <svg className="absolute inset-0 pointer-events-none" width={dimensions.width} height={dimensions.height}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" className="fill-muted-foreground" />
            </marker>
          </defs>

          {connections.map((connection, index) => {
            const fromX = (connection.from.x || 0) + NODE_WIDTH / 2
            const fromY = (connection.from.y || 0) + NODE_HEIGHT
            const toX = (connection.to.x || 0) + NODE_WIDTH / 2
            const toY = connection.to.y || 0

            // Create a curved path instead of straight line
            const midY = fromY + (toY - fromY) / 2
            const path = `M${fromX},${fromY} C${fromX},${midY} ${toX},${midY} ${toX},${toY}`

            return (
              <g key={index}>
                <path
                  d={path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                  className="stroke-muted-foreground"
                  strokeDasharray={connection.to.id === currentBranch ? "none" : "none"}
                  strokeOpacity={connection.to.id === currentBranch ? 1 : 0.7}
                />
              </g>
            )
          })}
        </svg>

        {/* Nodes */}
        {allNodes.map((node) => (
          <div
            key={node.id}
            className={`absolute cursor-pointer transition-all duration-200 hover:scale-105 ${getNodeColor(node)}`}
            style={{
              left: (node.x || 0) - NODE_WIDTH / 2,
              top: node.y || 0,
              width: NODE_WIDTH,
              height: NODE_HEIGHT,
            }}
            onClick={() => handleNodeClick(node.id)}
          >
            <div className="p-3 rounded-lg border-2 h-full flex flex-col justify-between shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{node.title}</span>
                </div>
                {node.id === currentBranch && (
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 animate-pulse" />
                )}
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {node.messages.length}
                  </Badge>
                  {getAIMessageCount(node.messages) > 0 && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      {getAIMessageCount(node.messages)} AI
                    </Badge>
                  )}
                </div>

                {node.children.length > 0 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    +{node.children.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Add branch buttons */}
        {allNodes.map((node) => (
          <Button
            key={`add-${node.id}`}
            size="sm"
            variant="outline"
            className="absolute opacity-0 hover:opacity-100 transition-opacity bg-background border-dashed"
            style={{
              left: (node.x || 0) + NODE_WIDTH / 2 - 12,
              top: (node.y || 0) + NODE_HEIGHT + 10,
              width: 24,
              height: 24,
              zIndex: 10,
            }}
            onClick={(e) => {
              e.stopPropagation()
              onCreateBranch(node.messages.length - 1)
            }}
          >
            <Plus className="w-3 h-3" />
          </Button>
        ))}
      </div>
    </div>
  )
}
