import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const NAV = [
  { label: "Markets", href: "#markets" },
  { label: "Platform", href: "#features" },
  { label: "Security", href: "#security" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={
        "sticky top-0 z-50 w-full border-b transition-colors " +
        (scrolled ? "border-border bg-background/85 backdrop-blur-xl" : "border-transparent")
      }
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:px-6 lg:flex lg:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold-gradient font-display text-sm font-bold text-primary-foreground">
            R
          </span>
          <span className="truncate font-display text-lg font-semibold tracking-tight">
            Recon<span className="text-primary">Finance</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth" search={{ mode: "signin" }}>
              Sign In
            </Link>
          </Button>
          <Button asChild variant="gold" size="sm">
            <Link to="/auth" search={{ mode: "signup" }}>
              Register
            </Link>
          </Button>
        </div>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border lg:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background/95 px-4 py-4 backdrop-blur-xl lg:hidden">
          <nav className="flex flex-col gap-3">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex gap-3">
            <Button asChild variant="goldOutline" size="sm" className="flex-1">
              <Link to="/auth" search={{ mode: "signin" }}>
                Sign In
              </Link>
            </Button>
            <Button asChild variant="gold" size="sm" className="flex-1">
              <Link to="/auth" search={{ mode: "signup" }}>
                Register
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
