import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/infrastructures/:path*",
    "/catalogs/:path*",
    "/softwares/:path*",
    "/users/:path*",
    "/api-interne/:path*",
    "/settings/:path*",
    "/events/:path*",
  ],
};
