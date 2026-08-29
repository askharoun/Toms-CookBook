import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#f5dca0", background: "linear-gradient(145deg, #9a72ff 0%, #692bd5 65%, #49218d 100%)", fontSize: 70, fontWeight: 500, fontStyle: "italic", fontFamily: "cursive", letterSpacing: "-5px", borderRadius: 42 }}>
      TC
    </div>,
    size,
  );
}
