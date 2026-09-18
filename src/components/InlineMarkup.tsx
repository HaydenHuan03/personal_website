import { parseInline } from '../utils/inlineMarkup';

interface InlineMarkupProps {
  text: string;
}

/** Renders a string with `**bold**` markers as text with emphasised spans. */
export default function InlineMarkup({ text }: InlineMarkupProps) {
  return (
    <>
      {parseInline(text).map((seg, i) =>
        seg.bold ? (
          <strong key={i} className="font-semibold text-stone-900">
            {seg.text}
          </strong>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}
