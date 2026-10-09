import type { ReactElement, ReactNode, Component, SyntheticEvent } from './index';
type Handler = (event: SyntheticEvent<any>) => void;
interface LooseProps {
  onChange?: Handler; onClick?: Handler; onKeyDown?: Handler; onMouseDown?: Handler;
  onCancel?: Handler; onBlur?: Handler; onSubmit?: Handler; onError?: Handler;
  [prop: string]: any;
}
export namespace JSX {
  type Element = ReactElement<any, any>;
  type ElementType = string | ((props: any) => ReactNode) | (new (props: any) => Component<any, any>);
  interface ElementChildrenAttribute { children: {} }
  interface IntrinsicAttributes { key?: string | number }
  interface IntrinsicElements { [name: string]: LooseProps }
}
export function jsx(type: any, props: any, key?: any): ReactElement;
export function jsxs(type: any, props: any, key?: any): ReactElement;
export const Fragment: unique symbol;
