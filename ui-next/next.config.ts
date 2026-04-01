import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import createNextIntlPlugin from "next-intl/plugin";

const devOrigins = process.env.NEXT_ALLOWED_DEV_ORIGINS
  ? process.env.NEXT_ALLOWED_DEV_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : undefined;

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  ...(process.env.NODE_ENV === "development" && devOrigins?.length ? { allowedDevOrigins: devOrigins } : {}),
};

const withMDX = createMDX({});
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(withMDX(nextConfig));
