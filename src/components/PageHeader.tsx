import Link from "next/link";

export function PageHeader({
  farmName,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  farmName: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="muted text-sm">Working as {farmName}</p>
        <h1 className="mt-1 text-4xl text-[var(--ink)]">{title}</h1>
        <p className="muted mt-2 max-w-2xl">{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn shrink-0">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
