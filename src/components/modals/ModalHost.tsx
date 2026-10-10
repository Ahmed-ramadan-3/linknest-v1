import { Suspense, lazy, useEffect } from 'react';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';

// Dialogs load on demand so the first screen ships less code.
const loaders = {
  form: () => import('./ResourceFormDialog').then((m) => ({ default: m.ResourceFormDialog })),
  detail: () => import('./ResourceDetailDialog').then((m) => ({ default: m.ResourceDetailDialog })),
  deleteResource: () => import('./DeleteResourceDialog').then((m) => ({ default: m.DeleteResourceDialog })),
  category: () => import('./CategoryDialog').then((m) => ({ default: m.CategoryDialog })),
  deleteCategory: () => import('./DeleteCategoryDialog').then((m) => ({ default: m.DeleteCategoryDialog })),
  settings: () => import('../settings/SettingsDialog').then((m) => ({ default: m.SettingsDialog })),
};

const ResourceFormDialog = lazy(loaders.form);
const ResourceDetailDialog = lazy(loaders.detail);
const DeleteResourceDialog = lazy(loaders.deleteResource);
const CategoryDialog = lazy(loaders.category);
const DeleteCategoryDialog = lazy(loaders.deleteCategory);
const SettingsDialog = lazy(loaders.settings);

/** Fetches the dialog code while the browser is idle, so the first click is instant. */
function preloadDialogs() {
  Object.values(loaders).forEach((load) => {
    load().catch(() => undefined);
  });
}

/** Renders whichever dialog the UI state asks for. Keyed so each open starts fresh. */
export function ModalHost() {
  const { modal } = useAppUi();
  const { resources } = useLibrary();

  useEffect(() => {
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const handle = idle ? idle(preloadDialogs) : window.setTimeout(preloadDialogs, 2500);
    return () => {
      if (!idle) window.clearTimeout(handle);
    };
  }, []);

  let content = null;
  switch (modal.kind) {
    case 'add':
      content = <ResourceFormDialog key="add" mode="create" initialType={modal.type} initialCategoryId={modal.categoryId} />;
      break;
    case 'edit': {
      const resource = resources.find((item) => item.id === modal.id);
      content = resource ? <ResourceFormDialog key={`edit-${modal.id}`} mode="edit" resource={resource} /> : null;
      break;
    }
    case 'detail':
      content = <ResourceDetailDialog key={`detail-${modal.id}`} id={modal.id} />;
      break;
    case 'deleteResource':
      content = <DeleteResourceDialog key={`del-${modal.id}`} id={modal.id} />;
      break;
    case 'category':
      content =
        modal.mode === 'create' ? (
          <CategoryDialog key={`cat-new-${modal.parentId ?? 'root'}`} mode="create" parentId={modal.parentId} />
        ) : (
          <CategoryDialog key={`cat-${modal.id}`} mode="edit" id={modal.id} />
        );
      break;
    case 'deleteCategory':
      content = <DeleteCategoryDialog key={`delcat-${modal.id}`} id={modal.id} />;
      break;
    case 'settings':
      content = <SettingsDialog key="settings" />;
      break;
    default:
      content = null;
  }
  return <Suspense fallback={null}>{content}</Suspense>;
}
