// Rows inside a card: Actions and SplitActions (secondary button rows), Fields (a column of Field), Field
// (label on the left, control on the right; `stack` puts the label above, for textareas) and InputPair.
import type { ComponentProps, ReactNode } from 'react';

export function Actions({ children, ...rest }: ComponentProps<'div'>) {
  return (
    <div {...rest} className="card-actions">
      {children}
    </div>
  );
}

/** Two related buttons in equal halves. */
export function SplitActions({ children, ...rest }: ComponentProps<'div'>) {
  return (
    <div {...rest} className="card-actions split">
      {children}
    </div>
  );
}

export function Fields({ children, className, ...rest }: ComponentProps<'div'>) {
  return (
    <div {...rest} className={className ? `fields ${className}` : 'fields'}>
      {children}
    </div>
  );
}

export function Field({
  label,
  title,
  stack,
  as = 'label',
  htmlFor,
  children,
  ...rest
}: Omit<ComponentProps<'label'>, 'className'> & {
  label: ReactNode;
  stack?: boolean;
  /** `div` for content that is not one input (a picker, a button group, an InputPair); the label text then
   * is a span, or a `<label htmlFor>` when `htmlFor` names the input it describes. */
  as?: 'label' | 'div';
}) {
  const className = stack ? 'field stack' : 'field';
  if (as === 'div')
    return (
      <div {...(rest as ComponentProps<'div'>)} title={title} className={className}>
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>}
        {children}
      </div>
    );
  return (
    <label {...rest} htmlFor={htmlFor} title={title} className={className}>
      {label}
      {children}
    </label>
  );
}

/** A number and its unit sharing one control column. */
export function InputPair({ children }: { children: ReactNode }) {
  return <span className="input-pair">{children}</span>;
}
