import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { connectDB } from "@/config/db";
import { getListingForPage } from "@/lib/services/listings";
import { getCountryName } from "@/config/countries";
import { serializeListingImages } from "@/models/listing";
import fs from "node:fs";
import path from "node:path";
import { PersianShaper } from "arabic-persian-reshaper";

export const runtime = "nodejs";

// Bidi reshaper helper to fix Arabic/Persian disconnected & reversed rendering in Satori
function bidiReshape(text) {
  if (!text) return "";
  try {
    const shaped = PersianShaper.convertArabic(text);
    // Split into tokens (Arabic/Persian blocks, numbers/LTR blocks, spaces)
    const tokens = shaped.match(/([\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+|[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s]+|\s+)/g) || [];
    // Reverse word tokens and characters within RTL words
    return tokens
      .reverse()
      .map((token) => {
        const isRtl = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(token);
        return isRtl ? token.split("").reverse().join("") : token;
      })
      .join("");
  } catch (err) {
    console.error("RTL reshape error:", err);
    return text;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const queryTitle = searchParams.get("title");
    const queryDesc = searchParams.get("desc");

    // Load fonts dynamically from CDN (Inter for English, Vazirmatn fallback for Persian user inputs)
    const fontUrlInter = "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-600-normal.woff";
    const fontUrlVazir = "https://cdn.jsdelivr.net/npm/@fontsource/vazirmatn@5.0.8/files/vazirmatn-arabic-500-normal.woff";

    const [interData, vazirData] = await Promise.all([
      fetch(new URL(fontUrlInter)).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch Inter font");
        return res.arrayBuffer();
      }),
      fetch(new URL(fontUrlVazir)).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch Vazirmatn font");
        return res.arrayBuffer();
      }),
    ]);

    const t = await getTranslations({ locale: "en", namespace: "seo" });

    // Load transparent brand logo from public folder
    let logoUrl = "";
    try {
      const logoPath = path.join(process.cwd(), "public", "logo-compressed.png");
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath).toString("base64");
        logoUrl = `data:image/png;base64,${logoData}`;
      }
    } catch (err) {
      console.error("Logo load error:", err);
    }

    const containsPersian = (text) => /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
    const formatText = (txt) => (containsPersian(txt) ? bidiReshape(txt) : txt);

    // 1. DYNAMIC LISTING DETAIL OG CARD (English Only, Clean White + Corner Blue Glow)
    if (id) {
      await connectDB();
      const listing = await getListingForPage(id);

      if (listing) {
        const tTypes = await getTranslations({ locale: "en", namespace: "listingTypes" });
        const tPetTypes = await getTranslations({ locale: "en", namespace: "petTypes" });

        // Resolve Location Label in English
        const city = listing.location?.city || "";
        const country = getCountryName(listing.location?.country, "en");
        const locationLabel = [city, country].filter(Boolean).join(", ") || "—";

        // Resolve Dynamic Photo URL
        const images = serializeListingImages(listing.images);
        const rawPhotoUrl = images[0]?.url;
        let photoUrl = "";

        if (rawPhotoUrl) {
          if (rawPhotoUrl.startsWith("http://") || rawPhotoUrl.startsWith("https://")) {
            photoUrl = rawPhotoUrl;
          } else {
            // Read file directly from local filesystem in Node.js to avoid dev-server concurrent request deadlock
            try {
              const localFilePath = path.join(process.cwd(), "public", rawPhotoUrl);
              if (fs.existsSync(localFilePath)) {
                const base64Data = fs.readFileSync(localFilePath).toString("base64");
                const ext = path.extname(rawPhotoUrl).replace(".", "") || "png";
                photoUrl = `data:image/${ext};base64,${base64Data}`;
              }
            } catch (err) {
              console.error("Local OG image filesystem read error:", err);
            }
            if (!photoUrl) {
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://unlostpaws.com";
              photoUrl = `${appUrl.replace(/\/$/, "")}${rawPhotoUrl}`;
            }
          }
        }

        // Type-specific light-palette colors for badges
        const typeColors = {
          missing: { bg: "rgba(239, 68, 68, 0.08)", border: "#fca5a5", text: "#b91c1c" },
          found: { bg: "rgba(209, 250, 229, 0.8)", border: "#a7f3d0", text: "#047857" },
          sighting: { bg: "rgba(254, 243, 199, 0.8)", border: "#fcd34d", text: "#b45309" },
          surrender: { bg: "rgba(219, 234, 254, 0.8)", border: "#bfdbfe", text: "#1d4ed8" },
        };

        const colors = typeColors[listing.type] || typeColors.missing;
        const typeLabel = tTypes(listing.type).toUpperCase();
        const petTypeLabel = tPetTypes(listing.petType);

        const formattedDate = new Date(listing.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        return new ImageResponse(
          (
            <div
              style={{
                height: "100%",
                width: "100%",
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                backgroundColor: "#ffffff",
                color: "#0f172a",
                fontFamily: "Inter, Vazirmatn",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Soft decorative background radial glow orb in details panel (top right) - highly visible */}
              <div
                style={{
                  position: "absolute",
                  top: "-150px",
                  right: "-150px",
                  width: "450px",
                  height: "450px",
                  borderRadius: "225px",
                  backgroundImage: "radial-gradient(circle, rgba(37, 99, 235, 0.18) 0%, rgba(37, 99, 235, 0.06) 50%, rgba(255, 255, 255, 0) 80%)",
                }}
              />

              {/* Pet Photo Column (Left side) */}
              <div
                style={{
                  width: "480px",
                  height: "630px",
                  display: "flex",
                  position: "relative",
                  backgroundColor: "#f1f5f9",
                  overflow: "hidden",
                }}
              >
                {photoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photoUrl}
                    alt={petTypeLabel}
                    style={{
                      width: "480px",
                      height: "630px",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      height: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#e2e8f0",
                    }}
                  >
                    <span style={{ fontSize: "160px" }}>🐾</span>
                  </div>
                )}
              </div>

              {/* Metadata Details Column (Right side) */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "60px",
                  alignItems: "flex-start",
                  borderLeft: "1px solid #e2e8f0",
                }}
              >
                {/* Top Row: Type Badge + Proper Logo and Logo Type (Icon + Text side-by-side) */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    width: "100%",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {/* Status Badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px 20px",
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "30px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: colors.text,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {typeLabel}
                    </span>
                  </div>

                  {/* Logo + Logo Type Brand Block */}
                  {logoUrl && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoUrl}
                        alt="Logo Icon"
                        style={{
                          width: "36px",
                          height: "36px",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "22px",
                          fontWeight: "bold",
                          color: "#0f172a",
                        }}
                      >
                        UnLostPaws
                      </span>
                    </div>
                  )}
                </div>

                {/* Core Info Section */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    marginTop: "20px",
                    width: "100%",
                  }}
                >
                  <h1
                    style={{
                      fontSize: "42px",
                      fontWeight: 800,
                      lineHeight: "1.2",
                      marginBottom: "25px",
                      color: "#0f172a",
                    }}
                  >
                    {formatText(`${listing.color || ""} ${petTypeLabel}`)}
                  </h1>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      width: "100%",
                      gap: "12px",
                    }}
                  >
                    {/* Breed */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        fontSize: "20px",
                        lineHeight: "1.4",
                      }}
                    >
                      <span style={{ color: "#64748b", width: "120px" }}>Breed:</span>
                      <span style={{ color: "#0f172a", fontWeight: "bold" }}>
                        {formatText(listing.breed || "Mixed / Unknown")}
                      </span>
                    </div>

                    {/* Location (with RTL shaping safety guards for Farsi/Arabic values) */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        fontSize: "20px",
                        lineHeight: "1.4",
                      }}
                    >
                      <span style={{ color: "#64748b", width: "120px" }}>Location:</span>
                      <span style={{ color: "#0f172a", fontWeight: "bold" }}>
                        {formatText(locationLabel)}
                      </span>
                    </div>

                    {/* Date */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        fontSize: "20px",
                        lineHeight: "1.4",
                      }}
                    >
                      <span style={{ color: "#64748b", width: "120px" }}>Reported:</span>
                      <span style={{ color: "#0f172a", fontWeight: "bold" }}>
                        {formattedDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Branding */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    width: "100%",
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "25px",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    marginTop: "20px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: "#94a3b8",
                      letterSpacing: "0.05em",
                    }}
                  >
                    unlostpaws.com
                  </span>
                </div>
              </div>
            </div>
          ),
          {
            width: 1200,
            height: 630,
            fonts: [
              {
                name: "Inter",
                data: interData,
                style: "normal",
                weight: 500,
              },
              {
                name: "Vazirmatn",
                data: vazirData,
                style: "normal",
                weight: 500,
              },
            ],
          }
        );
      }
    }

    // 2. DYNAMIC BRANDING OG CARD (FALLBACK / English Only, Clean White + Rich Hero Gradient Orbs)
    const cardTitle = queryTitle || t("defaultTitle") || "Lost & Found Pets";
    const cardDesc = queryDesc || t("defaultDescription") || "Help reunite pets with their families worldwide.";

    // Remove duplicate "UnLostPaws" suffix/prefix branding from page title
    const cleanTitle = cardTitle
      .replace(/^UnLostPaws\s*[|—\-]\s*/i, "")
      .replace(/\s*[|—\-]\s*UnLostPaws$/i, "");

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#ffffff",
            color: "#0f172a",
            padding: "80px",
            fontFamily: "Inter, Vazirmatn",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Rich primary glow orbs (Highly visible HeroDecor replication for Satori) */}
          {/* Top-Right Blue Glow Orb */}
          <div
            style={{
              position: "absolute",
              top: "-150px",
              right: "-150px",
              width: "600px",
              height: "600px",
              borderRadius: "300px",
              backgroundImage: "radial-gradient(circle, rgba(37, 99, 235, 0.22) 0%, rgba(37, 99, 235, 0.08) 50%, rgba(255, 255, 255, 0) 80%)",
            }}
          />
          {/* Bottom-Left Blue Glow Orb */}
          <div
            style={{
              position: "absolute",
              bottom: "-150px",
              left: "-150px",
              width: "450px",
              height: "450px",
              borderRadius: "225px",
              backgroundImage: "radial-gradient(circle, rgba(37, 99, 235, 0.14) 0%, rgba(37, 99, 235, 0.05) 50%, rgba(255, 255, 255, 0) 80%)",
            }}
          />

          {/* Text Details Section */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              width: "60%",
            }}
          >
            {/* Logo Badge */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "10px",
                marginBottom: "30px",
                padding: "8px 16px",
                backgroundColor: "rgba(13, 148, 136, 0.08)",
                borderRadius: "50px",
                border: "1px solid rgba(13, 148, 136, 0.2)",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "12px",
                  backgroundColor: "#0d9488",
                  border: "1px solid #0d9488",
                }}
              />
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#0d9488",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                UnLostPaws AI
              </span>
            </div>

            {/* Localized Page Title */}
            <h1
              style={{
                fontSize: "48px",
                fontWeight: 800,
                lineHeight: "1.25",
                marginBottom: "20px",
                color: "#0f172a",
              }}
            >
              {cleanTitle}
            </h1>

            {/* Localized Tagline */}
            <p
              style={{
                fontSize: "22px",
                lineHeight: "1.6",
                color: "#475569",
              }}
            >
              {cardDesc}
            </p>
          </div>

          {/* Logo Showcase */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "320px",
              height: "320px",
              position: "relative",
            }}
          >
            {logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt="Brand Logo"
                style={{
                  width: "280px",
                  height: "280px",
                }}
              />
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Inter",
            data: interData,
            style: "normal",
            weight: 500,
          },
          {
            name: "Vazirmatn",
            data: vazirData,
            style: "normal",
            weight: 500,
          },
        ],
      }
    );
  } catch (error) {
    console.error("Open Graph generation error:", error);
    return new Response(`Failed to generate Open Graph image: ${error.message}`, {
      status: 500,
    });
  }
}
