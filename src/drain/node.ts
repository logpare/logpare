import type { LogCluster } from './cluster.js';

/**
 * A node in the Drain parse tree.
 *
 * V8 Optimization: Uses Map<string, DrainNode> instead of plain objects
 * for dynamic children. This prevents V8 "dictionary mode" which would
 * cause 10-100x slower property access.
 *
 * V8 Optimization: All properties are initialized in the constructor
 * to ensure monomorphic object shapes.
 */
export class DrainNode {
  /** Depth of this node in the tree (0 = root) */
  readonly depth: number;

  /**
   * Child nodes keyed by token value.
   * Using Map instead of Object for V8 optimization.
   */
  readonly children: Map<string, DrainNode>;

  /**
   * Clusters (templates) stored at this node.
   * Only leaf nodes contain clusters.
   */
  readonly clusters: LogCluster[];

  constructor(depth: number) {
    this.depth = depth;
    this.children = new Map();
    this.clusters = [];
  }

  /**
   * Get or create a child node for the given key.
   */
  getOrCreateChild(key: string): DrainNode {
    let child = this.children.get(key);
    if (child === undefined) {
      child = new DrainNode(this.depth + 1);
      this.children.set(key, child);
    }
    return child;
  }

  /**
   * Check if this node has a child for the given key.
   */
  hasChild(key: string): boolean {
    return this.children.has(key);
  }

  /**
   * Get a child node by key, or undefined if not found.
   */
  getChild(key: string): DrainNode | undefined {
    return this.children.get(key);
  }

  /**
   * Add a cluster to this node.
   */
  addCluster(cluster: LogCluster): void {
    this.clusters.push(cluster);
  }

  /**
   * Get the number of children.
   */
  get childCount(): number {
    return this.children.size;
  }

  /**
   * Get the number of clusters.
   */
  get clusterCount(): number {
    return this.clusters.length;
  }
}
