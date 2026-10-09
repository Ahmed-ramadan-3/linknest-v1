/** Calm ambient backdrop: blurred light shapes and fine grain. No grid, no particles. */
export function Background() {
  return (
    <div className="ambient" aria-hidden="true">
      <span className="ambient__shape ambient__shape--a" />
      <span className="ambient__shape ambient__shape--b" />
      <span className="ambient__shape ambient__shape--c" />
      <span className="ambient__grain" />
    </div>
  );
}
