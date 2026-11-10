// Card structure: Card (the section is the mount point, so it renders its children as they are), CardHead
// (title, optional tag, status badge right after the title, head actions or toggles on the right) and Badge.
import { isValidElement, type ReactNode } from 'react';

export function Card({ children }: { id?: string; children: ReactNode }) {
  return <>{children}</>;
}

export interface BadgeData {
  text: string;
  /** Green when true, "todo" when false, plain when left out. */
  ok?: boolean;
  id?: string;
  className?: string;
}

export function Badge({ text, ok, id, className }: BadgeData) {
  const state = ok === undefined ? '' : ok ? ' ok' : ' todo';
  return (
    <span id={id} className={`badge${state}${className ? ` ${className}` : ''}`}>
      {text}
    </span>
  );
}

const isBadgeData = (b: unknown): b is BadgeData =>
  typeof b === 'object' && b !== null && !isValidElement(b) && 'text' in b;

export function CardHead({
  title,
  tag,
  badge,
  actions,
  toggles,
}: {
  title: ReactNode;
  /** Small outlined label after the title, e.g. "optional". */
  tag?: string;
  /** A badge description, or your own element. */
  badge?: BadgeData | ReactNode;
  /** Buttons for the top right, usually IconBtn. */
  actions?: ReactNode;
  /** Check toggles for the top right (Results cards); extract.css pushes the first one right. */
  toggles?: ReactNode;
}) {
  return (
    <div className="card-head">
      <h2>
        {title}
        {tag ? (
          <>
            {' '}
            <span className="tag">{tag}</span>
          </>
        ) : null}
      </h2>
      {isBadgeData(badge) ? <Badge {...badge} /> : (badge as ReactNode)}
      {toggles}
      {actions ? <div className="head-actions">{actions}</div> : null}
    </div>
  );
}
