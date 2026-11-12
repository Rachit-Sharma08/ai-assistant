import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

function CodeBlock({ children, ...props }) {
  const preRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const child = Array.isArray(children) ? children[0] : children;
  const className = child?.props?.className || "";
  const language = className.match(/language-([\w+#-]+)/)?.[1] || "";

  async function copyCode() {
    const text = preRef.current?.querySelector("code")?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="code-block">
      <div className="code-block-bar">
        <span>{language || "code"}</span>
        <button type="button" onClick={copyCode} aria-label="Code copy karo">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre ref={preRef} {...props}>
        {children}
      </pre>
    </div>
  );
}

export default function MarkdownRenderer({ content }) {
  return (
    <div className="markdown-body min-w-0 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="markdown-table-wrap">
              <table>{children}</table>
            </div>
          ),
          pre: CodeBlock,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
