"use client";

import { useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * QRCodeDisplay component
 * Renders a crisp vector SVG QR code and provides a button to export it as a high-res PNG file.
 *
 * @param {object} props
 * @param {string} props.value The URL or string encoded in the QR code
 * @param {number} [props.size=160] Display size in pixels
 * @param {boolean} [props.showDownload=false] Whether to show the "Download PNG" button
 * @param {string} [props.downloadLabel="Download QR Code"] Label for the download button
 * @param {string} [props.filename="pet-alert-qr.png"] File name when downloaded
 */
export function QRCodeDisplay({
  value,
  size = 160,
  showDownload = false,
  downloadLabel = "Download QR Code",
  filename = "pet-alert-qr.png",
}) {
  const containerRef = useRef(null);

  const handleDownloadPNG = useCallback(() => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector("svg");
    if (!svgElement) return;

    // Serialize SVG to XML string
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    // Render onto canvas for high-res PNG export (4x size for retina print quality)
    const exportSize = Math.max(size * 4, 800);
    const canvas = document.createElement("canvas");
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.onload = () => {
      if (ctx) {
        // Draw white background
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, exportSize, exportSize);
        ctx.drawImage(img, 0, 0, exportSize, exportSize);

        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(blobURL);
    };
    img.src = blobURL;
  }, [size, filename]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={containerRef}
        className="inline-block rounded-xl border border-border bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
      >
        <QRCodeSVG
          value={value}
          size={size}
          level="H"
          marginSize={2}
          aria-label="QR code for pet alert listing"
        />
      </div>

      {showDownload ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownloadPNG}
          className="gap-2 text-xs"
        >
          <Download className="size-3.5" />
          {downloadLabel}
        </Button>
      ) : null}
    </div>
  );
}
