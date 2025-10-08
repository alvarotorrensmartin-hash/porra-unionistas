export type BannerKind = 'info' | 'warning' | 'danger' | 'success';

export function Banner({
  kind = 'info',
  title,
  children,
}: {
  kind?: BannerKind;
  title: string;
  children?: React.ReactNode;
}) {
  const colors: Record<BannerKind, string> = {
    info:    '#e8f2ff',
    warning: '#fff6e5',
    danger:  '#ffe8e8',
    success: '#e9ffef',
  };
  const border: Record<BannerKind, string> = {
    info:    '#b3d4ff',
    warning: '#ffd28a',
    danger:  '#ffb4b4',
    success: '#a7f0c1',
  };
  return (
    <div style={{
      background: colors[kind],
      border: `1px solid ${border[kind]}`,
      padding: '12px 14px',
      borderRadius: 10,
      margin: '8px 0'
    }}>
      <strong style={{display:'block', marginBottom: 4}}>{title}</strong>
      {children && <div>{children}</div>}
    </div>
  );
}
