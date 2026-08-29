import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#f5dca0",
        background: "linear-gradient(145deg, #9a72ff 0%, #692bd5 62%, #49218d 100%)",
        fontSize: 176,
        fontWeight: 500,
        fontStyle: "italic",
        fontFamily: "cursive",
        letterSpacing: "-10px",
        borderRadius: 116,
        position: "relative",
      }}
    >
      TC
    </div>,
    size,
  );
}
