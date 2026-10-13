"use client";
import { useEffect, useState } from "react";

// Builds the section index from the article's h2 headings and highlights the
// one currently being read.
export default function LegalToc() {
  const [items, setItems] = useState<Array<{ id: string; label: string }>>([]);
  const [active, setActive] = useState("");
  useEffect(() => {
    const headings = [...document.querySelectorAll<HTMLHeadingElement>("#hp-legal-article h2")];
    headings.forEach((heading, index) => { if (!heading.id) heading.id = `secao-${index + 1}`; });
    setItems(headings.map((heading) => ({ id: heading.id, label: heading.textContent?.replace(/^\d+\.\s*/, "") ?? "" })));
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -65% 0px" },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, []);
  if (!items.length) return <nav className="hp-legal-toc" aria-hidden="true" />;
  return (
    <nav className="hp-legal-toc" aria-label="Nesta página">
      <small>NESTA PÁGINA</small>
      {items.map((item) => (
        <a key={item.id} href={`#${item.id}`} className={active === item.id ? "active" : ""}>{item.label}</a>
      ))}
    </nav>
  );
}
