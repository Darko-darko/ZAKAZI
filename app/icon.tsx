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
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 12,
            background: "#ffffff",
            border: "4px solid #0f766e",
          }}
        >
          <div
            style={{
              height: 13,
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
                width: 23,
                height: 13,
                borderLeft: "5px solid #0f766e",
                borderBottom: "5px solid #0f766e",
                transform: "rotate(-45deg)",
                marginTop: -4,
              }}
            />
          </div>
        </div>
      </div>
    ),
    size
  );
}
