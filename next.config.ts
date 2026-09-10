import type { NextConfig } from "next";

function listingPhotoPattern() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) {
    return null;
  }
  const supabase = new URL(raw);
  return {
    protocol: supabase.protocol.replace(":", "") as "http" | "https",
    hostname: supabase.hostname,
    ...(supabase.port ? { port: supabase.port } : {}),
    pathname: "/storage/v1/object/public/listing-photos/**",
  };
}

const listingPhotos = listingPhotoPattern();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      ...(listingPhotos ? [listingPhotos] : []),
    ],
  },
};

export default nextConfig;
