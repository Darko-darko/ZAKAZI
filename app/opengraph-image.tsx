import { ImageResponse } from "next/og";

export const alt =
  "zakazi.pro - online zakazivanje termina za salone, studije i ordinacije";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f5fbfa",
          color: "#111111",
          fontFamily: "Arial",
          padding: 64,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
            overflow: "hidden",
            border: "2px solid #d7ebe8",
            borderRadius: 32,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              width: 690,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: 56,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  borderRadius: 12,
                  background: "#0f766e",
                }}
              >
                <div style={{ height: 14, background: "#f5a524" }} />
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: 30,
                    fontWeight: 900,
                  }}
                >
                  z
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 34,
                  fontWeight: 800,
                  color: "#0f766e",
                }}
              >
                zakazi.pro
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  width: 360,
                  marginBottom: 24,
                  borderRadius: 999,
                  background: "#fff4db",
                  color: "#7a4a00",
                  padding: "10px 18px",
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                Za usluzne biznise
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 72,
                  fontWeight: 900,
                  lineHeight: 0.95,
                  letterSpacing: 0,
                }}
              >
                Online zakazivanje termina
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 24,
                  color: "#4b5563",
                  fontSize: 30,
                  lineHeight: 1.3,
                }}
              >
                Mini sajt i booking tok za salone, studije i ordinacije.
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, color: "#0f766e" }}>
              {["Mini sajt", "Booking 24/7", "Bez poziva"].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    border: "2px solid #b7ded9",
                    borderRadius: 999,
                    padding: "10px 16px",
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#e8f7f5",
              padding: 48,
            }}
          >
            <div
              style={{
                width: 330,
                display: "flex",
                flexDirection: "column",
                border: "2px solid #cce6e2",
                borderRadius: 24,
                overflow: "hidden",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "#0f766e",
                  color: "#ffffff",
                  padding: 26,
                }}
              >
                <div style={{ display: "flex", fontSize: 20, opacity: 0.9 }}>
                  Danas
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 8,
                    fontSize: 34,
                    fontWeight: 800,
                  }}
                >
                  Slobodni termini
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 14,
                  padding: 26,
                }}
              >
                {["09:00", "10:30", "12:00", "15:30", "17:00", "18:30"].map(
                  (time, index) => (
                    <div
                      key={time}
                      style={{
                        width: 126,
                        display: "flex",
                        justifyContent: "center",
                        borderRadius: 12,
                        background: index === 1 ? "#f5a524" : "#f3f4f6",
                        color: index === 1 ? "#111111" : "#374151",
                        padding: "14px 0",
                        fontSize: 24,
                        fontWeight: 800,
                      }}
                    >
                      {time}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
