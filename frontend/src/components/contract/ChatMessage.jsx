import ReactMarkdown from 'react-markdown'

/**
 * Renders an assistant reply as Markdown.
 *
 * The model answers with headings, bold text and bullet lists, so the raw text
 * would otherwise show its own `**` markers. `react-markdown` does not render
 * raw HTML unless `rehype-raw` is added, so untrusted model output cannot inject
 * markup.
 */
function ChatMessage({ content }) {
  return (
    <div className="chat-markdown text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          // `node` is react-markdown's own AST handle; stripping it keeps it
          // off the DOM. Links must not navigate the single-page app away.
          a: ({ node: _node, ...props }) => (
            <a target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default ChatMessage
