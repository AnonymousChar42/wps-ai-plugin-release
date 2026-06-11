declare module 'markdown-it' {
  class MarkdownIt {
    constructor(options?: any): void
    render(src: string, options?: any): string
    use(plugin: any, ...args: any[]): this
  }
  export = MarkdownIt
}

declare module '../js/mermaid-it-markdown' {
  export default function MermaidIt(md: any): void
}

declare module '../js/useSvgImageCopy' {
  export default function useSvgImageCopy(options: any): any
}
