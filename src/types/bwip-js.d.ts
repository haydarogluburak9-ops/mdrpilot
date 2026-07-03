declare module "bwip-js" {
  interface ToBufferOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    width?: number;
    includetext?: boolean;
  }
  function toBuffer(opts: ToBufferOptions): Promise<Uint8Array>;
  export default { toBuffer };
}
