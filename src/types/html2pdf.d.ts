declare module 'html2pdf.js' {
  function html2pdf(): Html2PdfInstance;
  interface Html2PdfInstance {
    set(options: Record<string, unknown>): Html2PdfInstance;
    from(element: HTMLElement): Html2PdfInstance;
    save(): Promise<void>;
  }
  export default html2pdf;
}
