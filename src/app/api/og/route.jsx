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

function bidiReshape(text) {
  if (!text) return "";
  try {
    const shaped = PersianShaper.convertArabic(text);
    const tokens = shaped.match(/([\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+|[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s]+|\s+)/g) || [];
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

function GlowOrb(props) {
  const { size, opacity1, opacity2, top, right, bottom, left } = props;
  const style = {
    position: "absolute",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: `${size / 2}px`,
    backgroundImage: `radial-gradient(circle, rgba(37, 99, 235, ${opacity1}) 0%, rgba(37, 99, 235, ${opacity2}) 50%, rgba(255, 255, 255, 0) 80%)`,
  };
  if (top !== undefined) style.top = top;
  if (right !== undefined) style.right = right;
  if (bottom !== undefined) style.bottom = bottom;
  if (left !== undefined) style.left = left;

  return <div style={style} />;
}

function getFontsConfig(interData, vazirData) {
  return [
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
  ];
}

async function loadFonts() {
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
  return { interData, vazirData };
}

function loadLogoBase64() {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-compressed.png");
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath).toString("base64");
      return `data:image/png;base64,${logoData}`;
    }
  } catch (err) {
    console.error("Logo load error:", err);
  }
  return "";
}

function resolvePhotoUrl(rawPhotoUrl) {
  if (!rawPhotoUrl) return "";
  if (rawPhotoUrl.startsWith("http://") || rawPhotoUrl.startsWith("https://")) {
    return rawPhotoUrl;
  }
  try {
    const localFilePath = path.join(process.cwd(), "public", rawPhotoUrl);
    if (fs.existsSync(localFilePath)) {
      const base64Data = fs.readFileSync(localFilePath).toString("base64");
      const ext = path.extname(rawPhotoUrl).replace(".", "") || "png";
      return `data:image/${ext};base64,${base64Data}`;
    }
  } catch (err) {
    console.error("Local OG image filesystem read error:", err);
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://unlostpaws.com";
  return `${appUrl.replace(/\/$/, "")}${rawPhotoUrl}`;
}

function LogoImage({ logoUrl, size, alt = "Logo" }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={logoUrl}
      alt={alt}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  );
}

function ListingImageCol({ photoUrl, petTypeLabel }) {
  return (
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
  );
}

function ListingStatusBadge({ colors, typeLabel }) {
  return (
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
  );
}

function ListingBrandHeader({ logoUrl }) {
  if (!logoUrl) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <LogoImage logoUrl={logoUrl} size={36} alt="Logo Icon" />
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
  );
}

function ListingInfoItem({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        fontSize: "20px",
        lineHeight: "1.4",
      }}
    >
      <span style={{ color: "#64748b", width: "120px" }}>{label}</span>
      <span style={{ color: "#0f172a", fontWeight: "bold" }}>
        {value}
      </span>
    </div>
  );
}

function ListingFooter() {
  return (
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
  );
}

function ListingOGLayout({ children }) {
  return (
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
      <GlowOrb size={450} top="-150px" right="-150px" opacity1={0.18} opacity2={0.06} />
      {children}
    </div>
  );
}

function ListingOGDetails(props) {
  const { listing, colors, typeLabel, logoUrl, locationLabel, formattedDate, petTypeLabel } = props;

  const containsPersian = (text) => /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
  const formatText = (txt) => (containsPersian(txt) ? bidiReshape(txt) : txt);

  return (
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
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <ListingStatusBadge colors={colors} typeLabel={typeLabel} />
        <ListingBrandHeader logoUrl={logoUrl} />
      </div>

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
          <ListingInfoItem label="Breed:" value={formatText(listing.breed || "Mixed / Unknown")} />
          <ListingInfoItem label="Location:" value={formatText(locationLabel)} />
          <ListingInfoItem label="Reported:" value={formattedDate} />
        </div>
      </div>

      <ListingFooter />
    </div>
  );
}

// DYNAMIC LISTING DETAIL OG CARD (English Only, Clean White + Corner Blue Glow)
async function renderListingOG({ listing, interData, vazirData, logoUrl }) {
  const tTypes = await getTranslations({ locale: "en", namespace: "listingTypes" });
  const tPetTypes = await getTranslations({ locale: "en", namespace: "petTypes" });

  const city = listing.location?.city || "";
  const country = getCountryName(listing.location?.country, "en");
  const locationLabel = [city, country].filter(Boolean).join(", ") || "—";

  const images = serializeListingImages(listing.images);
  const rawPhotoUrl = images[0]?.url;
  const photoUrl = resolvePhotoUrl(rawPhotoUrl);

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
      <ListingOGLayout>
        <ListingImageCol photoUrl={photoUrl} petTypeLabel={petTypeLabel} />
        <ListingOGDetails
          listing={listing}
          colors={colors}
          typeLabel={typeLabel}
          logoUrl={logoUrl}
          locationLabel={locationLabel}
          formattedDate={formattedDate}
          petTypeLabel={petTypeLabel}
        />
      </ListingOGLayout>
    ),
    {
      width: 1200,
      height: 630,
      fonts: getFontsConfig(interData, vazirData),
    }
  );
}

function FallbackContent({ cleanTitle, cardDesc }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        width: "60%",
      }}
    >
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
  );
}

function FallbackLogoShowcase({ logoUrl }) {
  if (!logoUrl) return null;
  return (
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
      <LogoImage logoUrl={logoUrl} size={280} alt="Brand Logo" />
    </div>
  );
}

// DYNAMIC BRANDING OG CARD (FALLBACK / English Only, Clean White + Rich Hero Gradient Orbs)
function renderFallbackOG({ cleanTitle, cardDesc, interData, vazirData, logoUrl }) {
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
        <GlowOrb size={600} top="-150px" right="-150px" opacity1={0.22} opacity2={0.08} />
        <GlowOrb size={450} bottom="-150px" left="-150px" opacity1={0.14} opacity2={0.05} />

        <FallbackContent cleanTitle={cleanTitle} cardDesc={cardDesc} />
        <FallbackLogoShowcase logoUrl={logoUrl} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: getFontsConfig(interData, vazirData),
    }
  );
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const queryTitle = searchParams.get("title");
    const queryDesc = searchParams.get("desc");

    const { interData, vazirData } = await loadFonts();
    const logoUrl = loadLogoBase64();

    if (id) {
      await connectDB();
      const listing = await getListingForPage(id);

      if (listing) {
        return await renderListingOG({ listing, interData, vazirData, logoUrl });
      }
    }

    const t = await getTranslations({ locale: "en", namespace: "seo" });
    const cardTitle = queryTitle || t("defaultTitle") || "Lost & Found Pets";
    const cardDesc = queryDesc || t("defaultDescription") || "Help reunite pets with their families worldwide.";

    const cleanTitle = cardTitle
      .replace(/^UnLostPaws\s*[|— -]\s*/i, "")
      .replace(/\s*[|— -]\s*UnLostPaws$/i, "");

    return renderFallbackOG({ cleanTitle, cardDesc, interData, vazirData, logoUrl });
  } catch (error) {
    console.error("Open Graph generation error:", error);
    return new Response(`Failed to generate Open Graph image: ${error.message}`, {
      status: 500,
    });
  }
}
