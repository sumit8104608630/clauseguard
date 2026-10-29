export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center sm:px-6 sm:py-14">
      {Icon ? (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}

      <h3 className="font-display text-base font-semibold text-slate-800">
        {title}
      </h3>

      {description ? (
        <p className="mt-1.5 max-w-md text-sm text-slate-500">{description}</p>
      ) : null}

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
