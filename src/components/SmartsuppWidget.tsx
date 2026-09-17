import { useEffect } from "react";

export function SmartsuppWidget() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const w = window as unknown as Record<string, unknown>;
    if (w["smartsupp"]) return;

    w["_smartsupp"] = (w["_smartsupp"] || {}) as Record<string, unknown>;
    ((w["_smartsupp"] as Record<string, unknown>)["key"] as string) =
      "bf6aea0a2b72b92fef19bb87832a9340858a45ca";

    const d = document;
    const s = d.getElementsByTagName("script")[0];
    const c = d.createElement("script");
    c.type = "text/javascript";
    c.charset = "utf-8";
    c.async = true;
    c.src = "https://www.smartsuppchat.com/loader.js?";
    s?.parentNode?.insertBefore(c, s);
  }, []);

  return null;
}
