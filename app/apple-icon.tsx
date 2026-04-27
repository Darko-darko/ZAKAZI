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
        }}
      >
        <div
          style={{
            width: 128,
            height: 128,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 28,
            background: "#ffffff",
            border: "10px solid #0f766e",
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
            }}
          >
            <div
              style={{
                width: 62,
                height: 36,
                borderLeft: "12px solid #0f766e",
                borderBottom: "12px solid #0f766e",
                transform: "rotate(-45deg)",
                marginTop: -10,
              }}
            />
          </div>
        </div>
      </div>
    ),
    size
  );
}
