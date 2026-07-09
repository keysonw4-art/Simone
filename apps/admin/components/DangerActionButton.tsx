"use client";

type Props = {
  action: () => Promise<void>;
  label: string;
  confirmMessage: string;
};

export function DangerActionButton({ action, label, confirmMessage }: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="px-4 py-2 text-[10px] uppercase tracking-widest border border-red-200 text-red-500/70 hover:border-red-500 hover:text-red-500 rounded-sm transition-colors"
      >
        {label}
      </button>
    </form>
  );
}
