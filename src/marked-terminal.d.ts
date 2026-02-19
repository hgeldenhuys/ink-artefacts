declare module 'marked-terminal' {
  import type { MarkedExtension } from 'marked';
  export function markedTerminal(options?: {
    width?: number;
    reflowText?: boolean;
    showSectionPrefix?: boolean;
    [key: string]: unknown;
  }): MarkedExtension;
}
