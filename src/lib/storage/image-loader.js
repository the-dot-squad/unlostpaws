'use client';

/**
 * Custom Next.js image loader for Cloudflare CDN Image Resizing.
 * 
 * Intercepts S3/R2 image requests and formats them to run through Cloudflare's
 * Edge image optimization tool (/cdn-cgi/image/...) in production.
 * 
 * @param {object} props
 * @param {string} props.src - The source URL of the image
 * @param {number} props.width - Target width provided by Next.js
 * @param {number} [props.quality] - Target quality (defaults to 75)
 * @returns {string} The optimized image URL
 */
export default function cloudflareImageLoader({ src, width, quality }) {
  // Relative paths, local assets, and local development proxy paths are served as-is
  if (
    src.startsWith('/') ||
    src.startsWith('http://localhost') ||
    src.startsWith('http://127.0.0.1')
  ) {
    return src;
  }

  try {
    const url = new URL(src);
    
    // Check if the domain is our custom S3 CDN domain or raw Cloudflare R2 hostname
    const isS3Domain =
      url.hostname === 's3.unlostpaws.com' ||
      url.hostname.endsWith('.r2.cloudflarestorage.com');
    
    if (isS3Domain) {
      const path = url.pathname.replace(/^\//, '');
      
      // Avoid double-prepending if it already contains the Cloudflare transform path
      if (path.startsWith('cdn-cgi/image/')) {
        return src;
      }
      
      const params = [
        `width=${width}`,
        `quality=${quality || 80}`,
        'format=auto'
      ];
      
      return `${url.origin}/cdn-cgi/image/${params.join(',')}/${path}`;
    }
  } catch (e) {
    // If URL parsing fails, degrade gracefully to the original source URL
  }

  return src;
}
