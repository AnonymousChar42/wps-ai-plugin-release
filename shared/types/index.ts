/**
 * Shared type definitions for WPS AI components
 */

// ============ Agent Types ============
export interface Agent {
  label: string
  showedContent: string
  extraPrompt: string
  useSelection?: boolean
  onClick?: ((agent: Agent) => void) | null
}

// ============ AI Configuration Types ============
export interface AIRequestConfig {
  baseURL: string
  model: string
  apiKey: string
}

export interface UrlLocked {
  baseURL: boolean
}

// ============ Chat Types ============
export interface ChatItem {
  key: string
  role: 'user' | 'assistant'
  content: string
  showedContent?: string
  renderedHtml?: string
  loading?: boolean
  finished?: boolean
  typing?: { step: number; interval: number }
}

// ============ Template Types ============
export interface TemplateConfig {
  msgTemplate: string
  btnTemplate: string
}

export interface TemplatesByProject {
  [key: string]: TemplateConfig
}

export interface PromptTemplates extends TemplateConfig {
  visible: boolean
}

// ============ UI Configuration Types ============
export interface RoleConfig {
  placement: 'start' | 'end'
  avatar: { icon: any }
  variant: 'filled' | 'outlined'
  shape: 'round'
}

export interface Roles {
  user: RoleConfig
  ai: RoleConfig
}

// ============ Form Types ============
export interface AIConfigFormData {
  baseURL: string
  model: string
  apiKey: string
}

export interface CustomAgentFormData {
  label: string
  showedContent: string
  extraPrompt: string
}

export interface FormErrors {
  label: string
  showedContent: string
  extraPrompt: string
}

// ============ Component Props Types ============
export interface AiPaneProps {
  storageKey: string
  defaultAgents: Agent[]
}

export interface ApiConfigFormProps {
  modelValue: AIRequestConfig
  urlLocked?: UrlLocked | boolean
}

export interface ChatBoxProps {
  aiRequestConfig: AIRequestConfig
  agents: Agent[]
}

export interface CustomAgentsProps {
  agents: Agent[]
}
