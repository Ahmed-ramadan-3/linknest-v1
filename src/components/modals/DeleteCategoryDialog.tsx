import { describeStorageError } from '../../data/db';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { useToast } from '../../hooks/useToast';
import { useI18n } from '../../i18n';
import { ConfirmDialog } from '../ui/ConfirmDialog';

/** Deleting a category never deletes resources: they move up one level (or become uncategorized). */
export function DeleteCategoryDialog({ id }: { id: string }) {
  const { categories, categoryById, counts, deleteCategory } = useLibrary();
  const { closeModal, navigate, route } = useAppUi();
  const toast = useToast();
  const { t, plural } = useI18n();
  const category = categoryById.get(id);

  if (!category) {
    return (
      <ConfirmDialog title={t('del.catGone')} confirmLabel={t('common.close')} onCancel={closeModal} onConfirm={closeModal}>
        <p>{t('del.catGoneBody')}</p>
      </ConfirmDialog>
    );
  }

  const parent = category.parentId ? categoryById.get(category.parentId) : undefined;
  const subcategories = categories.filter((c) => c.parentId === id).length;
  const direct = counts.direct.get(id) ?? 0;
  const destination = parent ? `“${parent.name}”` : t('del.catUncategorized');

  return (
    <ConfirmDialog
      title={t('del.catTitle', { name: category.name })}
      confirmLabel={t('del.catConfirm')}
      danger
      onCancel={closeModal}
      onConfirm={async () => {
        try {
          await deleteCategory({ id, childrenGoTo: parent?.id ?? null, resourcesGoTo: parent?.id ?? null });
          toast.success(t('del.catDone'));
          closeModal();
          if (route.name === 'category' && route.id === id) {
            navigate(parent ? { name: 'category', id: parent.id } : { name: 'home' });
          }
        } catch (error) {
          toast.error(describeStorageError(error));
        }
      }}
    >
      <p>
        {t('del.catKept')}{' '}
        {direct > 0 ? `${t('del.catMoveResources', { resources: plural('count.resource', direct), destination })} ` : ''}
        {subcategories > 0 ? t('del.catMoveSubs', { subs: plural('count.subcategory', subcategories), destination }) : ''}
        {direct === 0 && subcategories === 0 ? t('del.catEmpty') : ''}
      </p>
    </ConfirmDialog>
  );
}
