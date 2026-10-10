import { describeStorageError } from '../../data/db';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { useToast } from '../../hooks/useToast';
import { useI18n } from '../../i18n';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export function DeleteResourceDialog({ id }: { id: string }) {
  const { resources, deleteResource } = useLibrary();
  const { closeModal } = useAppUi();
  const toast = useToast();
  const { t } = useI18n();
  const resource = resources.find((item) => item.id === id);

  return (
    <ConfirmDialog
      title={t('del.resourceTitle')}
      confirmLabel={t('common.delete')}
      danger
      onCancel={closeModal}
      onConfirm={async () => {
        try {
          await deleteResource(id);
          toast.success(t('del.resourceDone'));
          closeModal();
        } catch (error) {
          toast.error(describeStorageError(error));
        }
      }}
    >
      {resource ? (
        <p>
          {t('del.resourceBody', { title: '\u0000' })
            .split('\u0000')
            .map((part, index) => (
              <span key={index}>
                {index > 0 ? <strong>{resource.title}</strong> : null}
                {part}
              </span>
            ))}
        </p>
      ) : (
        <p>{t('del.resourceGone')}</p>
      )}
    </ConfirmDialog>
  );
}
