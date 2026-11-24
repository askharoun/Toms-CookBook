"use client";
import { useEffect } from "react";

// Render the same fire mask, spacing, rounded tile, and theme gradients as Logo.
export function DynamicFavicon() {
  useEffect(() => {
    const root = document.documentElement;
    const flame = new Image();
    let disposed = false;
    let frame = 0;
    let ownedLink: HTMLLinkElement | null = null;
    const installOriginals = new Map<HTMLLinkElement, { href: string; sizes: string; type: string }>();
    const addedInstallLinks: HTMLLinkElement[] = [];
    const originals = new Map<HTMLLinkElement, { href: string; type: string; sizes: string }>();
    const gradient = (context: CanvasRenderingContext2D, size: number, angle: number, start: string, end: string) => {
      const radians = angle * Math.PI / 180;
      const x = Math.sin(radians), y = -Math.cos(radians);
      const length = size * (Math.abs(x) + Math.abs(y));
      const result = context.createLinearGradient(size / 2 - x * length / 2, size / 2 - y * length / 2, size / 2 + x * length / 2, size / 2 + y * length / 2);
      result.addColorStop(0, start); result.addColorStop(1, end);
      return result;
    };
    const syncInstallIcons = () => {
      const color = ["violet", "emerald", "rose"].includes(root.dataset.accent || "") ? root.dataset.accent! : "violet";
      const mode = root.classList.contains("dark") ? "dark" : "light";
      for (const rel of ["apple-touch-icon", "apple-touch-icon-precomposed", "manifest"]) {
        const links = [...document.head.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`)];
        if (!links.length && rel !== "apple-touch-icon-precomposed") {
          const link = document.createElement("link"); link.rel = rel; document.head.appendChild(link); addedInstallLinks.push(link); links.push(link);
        }
        for (const link of links) {
          if (!installOriginals.has(link) && !addedInstallLinks.includes(link)) installOriginals.set(link, { href: link.href, sizes: link.sizes.value, type: link.type });
          const href = rel === "manifest" ? `/manifests/${color}-${mode}.webmanifest` : `/icons/themed/fire-${color}-${mode}-180.png`;
          if (link.getAttribute("href") !== href) link.setAttribute("href", href);
          if (rel !== "manifest") { link.sizes.value = "180x180"; link.type = "image/png"; }
        }
      }
    };
    const render = () => {
      if (disposed) return;
      syncInstallIcons();
      if (disposed || !flame.complete || !flame.naturalWidth) return;
      const styles = getComputedStyle(root);
      const accent = `rgb(${styles.getPropertyValue("--accent").trim()})`;
      const deep = `rgb(${styles.getPropertyValue("--accent-deep").trim()})`;
      const soft = styles.getPropertyValue("--accent-soft").trim().split(/\s+/).map(Number);
      const tint = `rgb(${soft.map(channel => Math.round(channel * .35 + 255 * .65)).join(" ")})`;
      const size = 64;
      const canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.beginPath(); context.roundRect(0, 0, size, size, size * 14 / 44);
      context.fillStyle = gradient(context, size, 145, accent, deep); context.fill();
      const mask = document.createElement("canvas"); mask.width = size; mask.height = size;
      const ink = mask.getContext("2d");
      if (!ink) return;
      const markSize = size * 28 / 44, inset = (size - markSize) / 2;
      ink.drawImage(flame, inset, inset, markSize, markSize);
      ink.globalCompositeOperation = "source-in";
      ink.translate(inset, inset);
      ink.fillStyle = gradient(ink, markSize, 155, "#ffffff", tint);
      ink.fillRect(0, 0, markSize, markSize);
      context.drawImage(mask, 0, 0);
      const href = canvas.toDataURL("image/png");
      const links = [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]')];
      if (!links.length) {
        ownedLink = document.createElement("link"); ownedLink.rel = "icon";
        document.head.appendChild(ownedLink); links.push(ownedLink);
      }
      for (const link of links) {
        if (link !== ownedLink && !originals.has(link)) originals.set(link, { href: link.href, type: link.type, sizes: link.sizes.value });
        link.type = "image/png"; link.sizes.value = "64x64"; link.href = href;
      }
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); };
    flame.onload = schedule;
    flame.src = "/assets/logo.png";
    const observer = new MutationObserver(schedule);
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-accent", "style"] });
    schedule();
    return () => {
      disposed = true; observer.disconnect(); cancelAnimationFrame(frame); flame.onload = null;
      ownedLink?.remove();
      addedInstallLinks.forEach(link => link.remove());
      for (const [link, original] of installOriginals) { link.href = original.href; link.sizes.value = original.sizes; link.type = original.type; }
      for (const [link, original] of originals) { link.href = original.href; link.type = original.type; link.sizes.value = original.sizes; }
    };
  }, []);
  return null;
}
