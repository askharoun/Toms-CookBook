import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/LogoMark";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex" }}><LogoMark size={512} /></div>,
    { width: 512, height: 512 },
  );
}
