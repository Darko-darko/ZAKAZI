import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 14,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 10,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              height: 12,
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
              fontSize: 26,
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
