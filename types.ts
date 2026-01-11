export interface ResearchConfig {
  query: string;
  depth: number;   // 1=Brief, 2=Standard, 3=Deep
  breadth: number; // Sources per section
}

export interface Settings {
  provider: 'google' | 'openai';
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ResearchLog {
  id: string;
  timestamp: number;
  type: 'plan' | 'search' | 'analysis' | 'writing' | 'error' | 'info';
  message: string;
  details?: any;
}

export interface Source {
  title: string;
  uri: string;
}

export interface ResearchResult {
  id: string; // Unique ID for history
  timestamp: number; // Created time
  title: string;
  sections: string[]; 
  fullReport: string; 
  sources: Source[];
  logs: ResearchLog[];
}

export enum AppState {
  IDLE = 'IDLE',
  RESEARCHING = 'RESEARCHING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}