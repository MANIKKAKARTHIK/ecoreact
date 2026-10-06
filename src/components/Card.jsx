export default function Card({title, value, icon, children}) {
 return <div className="card stat"><div className="stat-icon">{icon}</div><div><div className="muted">{title}</div><strong>{value}</strong>{children}</div></div>
}
