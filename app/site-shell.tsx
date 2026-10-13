"use client";
import { useEffect, useState } from "react";
import StoreHeader from "./store-header";
import StoreFooter from "./store-footer";
import { useReveal } from "./use-reveal";

// Shared frame for every page that is not a full custom layout (Home,
// catalog, product): store header, page content and store footer.
export default function SiteShell({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  useEffect(() => {
    try {
      setCartCount((JSON.parse(localStorage.getItem("highparts_cart") || "[]") as unknown[]).length);
    } catch {}
    fetch("/api/auth/me")
      .then((response) => response.json() as Promise<{ user?: { name: string } | null }>)
      .then((data) => setUserName(data.user?.name ?? null))
      .catch(() => {});
  }, []);
  useReveal();
  return (
    <>
      <StoreHeader userName={userName} cartCount={cartCount} />
      <main className="hp-main">{children}</main>
      <StoreFooter />
    </>
  );
}
