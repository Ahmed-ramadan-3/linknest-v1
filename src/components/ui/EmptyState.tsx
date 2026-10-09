import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';

interface EmptyStateProps {
  icon: IconType;
  title: string;
  message: string;
  children?: ReactNode;
}

export function EmptyState({ icon: IconComponent, title, message, children }: EmptyStateProps) {
  return (
    <div className="empty glass">
      <span className="empty__icon">
        <IconComponent className="icon" size={26} aria-hidden="true" />
      </span>
      <h3 className="empty__title">{title}</h3>
      <p className="empty__message">{message}</p>
      {children ? <div className="empty__actions">{children}</div> : null}
    </div>
  );
}
