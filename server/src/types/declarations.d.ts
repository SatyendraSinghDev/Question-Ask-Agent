/** Ambient declarations for packages without bundled types. */
declare module 'hpp' {
  import type { RequestHandler } from 'express';
  function hpp(): RequestHandler;
  export default hpp;
}

declare module 'pdf-parse' {
  interface PdfData {
    numpages?: number;
    numrender?: number;
    info?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    text?: string;
    version?: string;
  }
  function pdfParse(data: Buffer): Promise<PdfData>;
  export default pdfParse;
}
