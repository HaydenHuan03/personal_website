import { parseBlocks, parseRich } from '@/lib/chatMarkup';

function Rich({ text }: { text: string }) {
  return (
    <>
      {parseRich(text).map((seg, i) => {
        const content = seg.bold ? <strong className="font-semibold">{seg.text}</strong> : seg.text;
        return seg.href ? (
          <a
            key={i}
            href={seg.href}
            target={seg.href.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="break-all text-accent-strong underline underline-offset-2 dark:text-accent-soft"
          >
            {content}
          </a>
        ) : (
          <span key={i}>{content}</span>
        );
      })}
    </>
  );
}

/** Renders a chat reply's paragraphs, bullet lists, bold text and links. */
export default function ChatMarkup({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {parseBlocks(text).map((block, i) =>
        block.type === 'p' ? (
          <p key={i}>
            <Rich text={block.text} />
          </p>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-5 marker:text-stone-400">
            {block.items.map((item, j) => (
              <li key={j}>
                <Rich text={item} />
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
