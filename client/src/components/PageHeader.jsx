/**
 * Единый заголовок страницы: иконка, название, блок действий справа.
 */
export default function PageHeader({ icon: Icon, title, children, className = '' }) {
  return (
    <div className={`header page-header ${className}`.trim()}>
      <h1>
        {Icon && <Icon size={24} />}
        {title}
      </h1>
      {children && <div className="header-actions">{children}</div>}
    </div>
  );
}
