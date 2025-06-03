"use client"

import { useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FlowchartTree } from "./flowchart-tree"
import { GitBranch, MessageSquare, ChevronRight, ChevronDown, Plus, Eye, BarChart3 } from "lucide-react"

interface ConversationNode {
  id: string
  title: string
  messages: any[]
  children: ConversationNode[]
  createdAt?: Date
}

interface PromptTreeSidebarProps {
  conversationTree: ConversationNode
  currentBranch: string
  onSwitchBranch: (branchId: string) => void
  onCreateBranch: (messageIndex: number) => void
}

export function PromptTreeSidebar({
  conversationTree,
  currentBranch,
  onSwitchBranch,
  onCreateBranch,
}: PromptTreeSidebarProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["root"]))
  const { state } = useSidebar()

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const renderNode = (node: ConversationNode, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const isActive = currentBranch === node.id
    const hasChildren = node.children.length > 0

    return (
      <div key={node.id}>
        <SidebarMenuItem>
          <div className="flex items-center w-full">
            <SidebarMenuButton
              onClick={() => onSwitchBranch(node.id)}
              className={`flex-1 justify-start ${isActive ? "bg-accent text-accent-foreground" : ""}`}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              <div className="flex items-center gap-2 flex-1">
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleNode(node.id)
                    }}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                )}
                <GitBranch className="w-4 h-4" />
                <span className="text-sm truncate">{node.title}</span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {node.messages.length}
                </Badge>
              </div>
            </SidebarMenuButton>
          </div>
        </SidebarMenuItem>

        {isExpanded && hasChildren && <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>}
      </div>
    )
  }

  return (
    <Sidebar side="right" className="w-80" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">Conversation Tree</h2>
          <Button size="sm" variant="outline" className="group-data-[collapsible=icon]:hidden">
            <Plus className="w-4 h-4 mr-1" />
            New Branch
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="group-data-[collapsible=icon]:hidden">
          <Tabs defaultValue="flowchart" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mx-2">
              <TabsTrigger value="flowchart" className="text-xs">
                <BarChart3 className="w-3 h-3 mr-1" />
                Flowchart
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs">
                <GitBranch className="w-3 h-3 mr-1" />
                List
              </TabsTrigger>
            </TabsList>

            <TabsContent value="flowchart" className="mt-2">
              <div className="h-[400px] border rounded-lg mx-2">
                <FlowchartTree
                  conversationTree={conversationTree}
                  currentBranch={currentBranch}
                  onSwitchBranch={onSwitchBranch}
                  onCreateBranch={onCreateBranch}
                />
              </div>
            </TabsContent>

            <TabsContent value="list" className="mt-2">
              <SidebarGroup>
                <SidebarGroupLabel>Conversation Branches</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>{renderNode(conversationTree)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </TabsContent>
          </Tabs>
        </div>

        <div className="group-data-[collapsible=icon]:hidden">
          <SidebarGroup>
            <SidebarGroupLabel>Branch Statistics</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-3 text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Total Branches:</span>
                  <Badge variant="secondary">{countBranches(conversationTree)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Current Messages:</span>
                  <Badge variant="secondary">{getCurrentBranchMessages(conversationTree, currentBranch)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>AI Interactions:</span>
                  <Badge variant="secondary">{countAIMessages(conversationTree, currentBranch)}</Badge>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-2 space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Eye className="w-4 h-4 mr-2" />
                  View Full Tree
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <GitBranch className="w-4 h-4 mr-2" />
                  Export Branch
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Branch Summary
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Icon mode content */}
        <div className="group-data-[collapsible=icon]:block hidden p-2">
          <Button variant="ghost" size="icon" className="w-full mb-2" title="Conversation Tree">
            <GitBranch className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-full mb-2" title="Statistics">
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-full" title="Quick Actions">
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}

function countBranches(node: ConversationNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countBranches(child), 0)
}

function getCurrentBranchMessages(tree: ConversationNode, branchId: string): number {
  const findBranch = (node: ConversationNode): ConversationNode | null => {
    if (node.id === branchId) return node
    for (const child of node.children) {
      const found = findBranch(child)
      if (found) return found
    }
    return null
  }

  const branch = findBranch(tree)
  return branch ? branch.messages.length : 0
}

function countAIMessages(tree: ConversationNode, branchId: string): number {
  const findBranch = (node: ConversationNode): ConversationNode | null => {
    if (node.id === branchId) return node
    for (const child of node.children) {
      const found = findBranch(child)
      if (found) return found
    }
    return null
  }

  const branch = findBranch(tree)
  if (!branch) return 0

  return branch.messages.filter((msg) => msg.role === "assistant").length
}
