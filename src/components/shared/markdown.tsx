import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

/** Renders trusted-format Markdown (GFM). Raw HTML is never rendered. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-none text-[15px] leading-relaxed text-foreground/90",
        "[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground",
        "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-foreground",
        "[&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1",
        "[&_li:has(input)]:list-none [&_li:has(input)]:-ml-6 [&_input]:mr-2 [&_input]:accent-primary",
        "[&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline [&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_blockquote]:my-4 [&_blockquote]:rounded-r-lg [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:bg-accent/40 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:text-sm",
        "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:px-3 [&_td]:py-2",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-sm",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target={href?.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer nofollow">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
