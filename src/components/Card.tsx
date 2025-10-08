export default function Card({ title, subtitle, badge, children }:{
  title: string;
  subtitle?: string;
  badge?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="row" style={{justifyContent:'space-between'}}>
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {badge && <span className="badge gold">{badge}</span>}
      </div>
      {children}
    </div>
  );
}
