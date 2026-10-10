import { useI18n } from '../../i18n';
import { Dialog } from '../ui/Dialog';

interface Props {
  existing: { title: string; url: string };
  confirmLabel: string;
  onOpenExisting: () => void;
  onAddAnyway: () => void;
  onCancel: () => void;
}

export function DuplicateDialog({ existing, confirmLabel, onOpenExisting, onAddAnyway, onCancel }: Props) {
  const { t } = useI18n();
  return (
    <Dialog
      title={t('dup.title')}
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="button button--ghost" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button type="button" className="button button--soft" onClick={onOpenExisting}>
            {t('dup.openExisting')}
          </button>
          <button type="button" className="button button--primary" onClick={onAddAnyway}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="stack prose">
        <p>
          {t('dup.body', { title: '\u0000' })
            .split('\u0000')
            .map((part, index) => (
              <span key={index}>
                {index > 0 ? <strong>{existing.title}</strong> : null}
                {part}
              </span>
            ))}
        </p>
        <p className="muted break">{existing.url}</p>
      </div>
    </Dialog>
  );
}
