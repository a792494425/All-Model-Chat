import type { FileNode } from './importContextTypes';

const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const stableCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'variant',
});

function compareNaturalText(firstText: string, secondText: string): number {
  return naturalCollator.compare(firstText, secondText) || stableCollator.compare(firstText, secondText);
}

export function compareFilePaths(firstPath: string, secondPath: string): number {
  return compareNaturalText(firstPath, secondPath);
}

export function compareTreeNodes(firstNode: FileNode, secondNode: FileNode): number {
  if (firstNode.isDirectory !== secondNode.isDirectory) {
    return firstNode.isDirectory ? -1 : 1;
  }

  return compareNaturalText(firstNode.name, secondNode.name) || compareNaturalText(firstNode.path, secondNode.path);
}

export function sortTreeNodes(nodes: FileNode[]): FileNode[] {
  nodes.sort(compareTreeNodes);

  for (const node of nodes) {
    if (node.isDirectory) {
      sortTreeNodes(node.children);
    }
  }

  return nodes;
}
