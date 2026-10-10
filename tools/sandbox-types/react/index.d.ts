// SANDBOX ONLY. A minimal stand-in for @types/react, used by tsconfig.sandbox.json when the
// npm registry is unreachable. Real projects use @types/react (see package.json); this file
// is not used by `npm run typecheck`. DOM props and event objects are intentionally loose here.
export type Key = string | number;
export type ReactNode = ReactElement | string | number | boolean | null | undefined | Iterable<ReactNode>;
export interface ReactElement<P = any, T = any> { type: T; props: P; key: Key | null }
export type ComponentType<P = {}> = ((props: P) => ReactNode) | (new (props: P) => Component<P, any>);
export type FC<P = {}> = (props: P) => ReactNode;
export type Dispatch<A> = (value: A) => void;
export type SetStateAction<S> = S | ((prev: S) => S);
export type EffectCallback = () => void | (() => void);
export type DependencyList = readonly unknown[];
export interface RefObject<T> { current: T }
export interface MutableRefObject<T> { current: T }
export interface ErrorInfo { componentStack?: string | null }
export interface SyntheticEvent<T = Element> {
  target: any;
  currentTarget: T;
  preventDefault(): void;
  stopPropagation(): void;
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}
export type FormEvent<T = Element> = SyntheticEvent<T>;
export type ChangeEvent<T = Element> = SyntheticEvent<T> & { target: T & any };
export type KeyboardEvent<T = Element> = SyntheticEvent<T>;
export type MouseEvent<T = Element> = SyntheticEvent<T>;
export interface SVGAttributes<T = Element> { [prop: string]: any }
export interface Context<T> { Provider: FC<{ value: T; children?: ReactNode }>; Consumer: any }
export function createContext<T>(defaultValue: T): Context<T>;
export function useContext<T>(context: Context<T>): T;
export function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
export function useReducer<S, A>(reducer: (s: S, a: A) => S, initial: S): [S, Dispatch<A>];
export function useEffect(effect: EffectCallback, deps?: DependencyList): void;
export function useLayoutEffect(effect: EffectCallback, deps?: DependencyList): void;
export function useMemo<T>(factory: () => T, deps: DependencyList): T;
export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: DependencyList): T;
export function useRef<T>(initial: T): MutableRefObject<T>;
export function useRef<T>(initial: T | null): RefObject<T | null>;
export function useRef<T = undefined>(): MutableRefObject<T | undefined>;
export function useId(): string;
export function memo<P>(component: FC<P>): FC<P>;
export class Component<P = {}, S = {}> {
  constructor(props: P);
  props: Readonly<P> & { children?: ReactNode };
  state: S;
  setState(state: Partial<S>): void;
  render(): ReactNode;
  componentDidCatch?(error: Error, info: ErrorInfo): void;
}
export const StrictMode: FC<{ children?: ReactNode }>;
export const Suspense: FC<{ fallback?: ReactNode; children?: ReactNode }>;
export function lazy<P>(load: () => Promise<{ default: FC<P> }>): FC<P>;
export function useSyncExternalStore<T>(
  subscribe: (notify: () => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot?: () => T,
): T;
export function useDeferredValue<T>(value: T): T;
