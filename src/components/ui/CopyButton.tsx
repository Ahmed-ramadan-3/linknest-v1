import { useEffect, useRef, useState } from 'react';
import { LuCheck, LuCopy } from 'react-icons/lu';
import { useToast } from '../../hooks/useToast';
import { copyText } from '../../lib/clipboard';

interface CopyButtonProps {
  text: string;
  /** Accessible name and visible text (when `label` is shown). */
  label: string;
  successMessage: string;
  variant?: 'icon' | 'button';
}

/** Copies text, shows a small success state on the button and a transient toast. */
export function CopyButton({ text, label, successMessage, variant = 'icon' }: CopyButtonProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = async () => {
    const ok = await copyText(text);
    if (!ok) {
      toast.error('Copying is not available here. Select the text and copy it manually.');
      return;
    }
    toast.success(successMessage);
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  const Glyph = copied ? LuCheck : LuCopy;
  if (variant === 'button') {
    return (
      <button type="button" className={`button button--soft${copied ? ' is-copied' : ''}`} onClick={onClick}>
        <Glyph className="icon pop" size={16} aria-hidden="true" key={String(copied)} />
        {copied ? 'Copied' : label}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`icon-button${copied ? ' is-copied' : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Glyph className="icon pop" size={16} aria-hidden="true" key={String(copied)} />
    </button>
  );
}
