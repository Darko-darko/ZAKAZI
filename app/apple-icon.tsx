import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f766e",
        }}
      >
        <div
          style={{
            width: 118,
            height: 118,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 26,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              height: 32,
              background: "#f5a524",
            }}
          />
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0f766e",
              fontSize: 76,
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            z
          </div>
        </div>
      </div>
    ),
    size
  );
}
