"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/** Keeps filter controls in the URL so server components do the filtering. */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (patch: Record<string, string>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === "all") sp.delete(k);
      else sp.set(k, v);
    }
    if (!("page" in patch)) sp.delete("page");
    start(() => router.replace(`${pathname}${sp.toString() ? `?${sp}` : ""}`, { scroll: false }));
  };
  return { set, params, pending };
}

export function SearchInput({ name, placeholder, initial }: { name: string; placeholder: string; initial: string }) {
  const { set } = useUrlFilters();
  const [value, setValue] = useState(initial);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => set({ [name]: value.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="search-field">
      <span>⌕</span>
      <input aria-label={placeholder} placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
    </div>
  );
}

export function SelectFilter({ name, value, options, label }: { name: string; value: string; options: { value: string; label: string }[]; label: string }) {
  const { set } = useUrlFilters();
  return (
    <select aria-label={label} value={value} onChange={(e) => set({ [name]: e.target.value })}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function DateFilter({ name, value, label }: { name: string; value: string; label: string }) {
  const { set } = useUrlFilters();
  return <input type="date" aria-label={label} value={value} onChange={(e) => set({ [name]: e.target.value })} />;
}
