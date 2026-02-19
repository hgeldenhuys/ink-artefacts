/**
 * Artifact descriptor -- written as JSON to the artifacts directory.
 * Any external process (Claude, a script, etc.) can inject artifacts at runtime.
 */
export interface ArtifactDescriptor {
  /** Unique ID for this artifact */
  id: string;
  /** Display title shown in the tab bar */
  title: string;
  /** Artifact type -- determines which renderer to use */
  type: 'json-tree' | 'disk-usage' | 'file-list' | 'key-value' | 'log' | 'markdown' | 'table';
  /** The data payload for the renderer */
  data: unknown;
  /** Optional timestamp */
  createdAt?: string;
}

export interface ArtifactEntry {
  descriptor: ArtifactDescriptor;
  filePath: string;
}
