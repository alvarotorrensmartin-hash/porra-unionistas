export function Medal({ place }:{ place:number }) {
  if (place === 1) return <span className="medal gold">🥇</span>;
  if (place === 2) return <span className="medal silver">🥈</span>;
  if (place === 3) return <span className="medal bronze">🥉</span>;
  return null;
}
