import { Mail, MessageCircle } from 'lucide-react';
import { emailUrl, whatsappUrl } from '@/lib/chat';

/** WhatsApp and email buttons, shown when the assistant cannot answer. */
export default function ContactActions({ question }: { question?: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a
        href={whatsappUrl(question)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
      >
        <MessageCircle size={14} /> Message Hayden on WhatsApp
      </a>
      <a
        href={emailUrl(question)}
        className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-200 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-800"
      >
        <Mail size={14} /> Email
      </a>
    </div>
  );
}
