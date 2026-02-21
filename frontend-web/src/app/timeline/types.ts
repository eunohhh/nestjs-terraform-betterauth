export type HistorianEventNode = {
  id: string;
  created: string;
  title: string;
  content: string;
  sourcePath: string;
  theme?: string | null;
  source?: string | null;
  kind?: string | null;
  era?: string | null;
  tags?: string[];
  people?: string[];
};

export type GraphEdge = {
  from: string;
  to: string;
  type: string;
};

export type Graph = {
  nodes: HistorianEventNode[];
  edges: GraphEdge[];
};

export type NodeType = 'topic' | 'tag' | 'person' | 'event';

export type SimNode = HistorianEventNode & {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  index?: number;
};

export type SimLink = {
  source: string | SimNode;
  target: string | SimNode;
  type: string;
};
