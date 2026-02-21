import type { HistorianEventNode, NodeType } from './types';

export function nodeType(n: HistorianEventNode): NodeType {
  if (n.id.startsWith('topic:')) return 'topic';
  if (n.id.startsWith('tag:')) return 'tag';
  if (n.id.startsWith('person:')) return 'person';
  return 'event';
}

export function isTopic(n: HistorianEventNode) {
  return nodeType(n) === 'topic';
}

export function isExtraNode(n: HistorianEventNode) {
  return nodeType(n) !== 'event';
}

export function labelFor(n: HistorianEventNode) {
  if (isExtraNode(n)) return n.title;
  return `${n.created} · ${n.title}`;
}
