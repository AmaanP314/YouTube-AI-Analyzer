/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        port: "",
        pathname: "/vi/**",
      },
      {
        protocol: "http", // Or 'https' if you only expect HTTPS links
        hostname: "*.googleusercontent.com", // Wildcard for any subdomain
        port: "",
        pathname: "/**", // Allows any path on googleusercontent.com
      },
      {
        protocol: "https", // Often served over HTTP, but can be HTTPS too. Include both for robustness or 'https' only if you are sure.
        hostname: "yt3.ggpht.com", // Wildcard for any subdomain of ggpht.com (e.g., yt3.ggpht.com)
        port: "",
        pathname: "/**", // Allows any path
      },
    ],
  },
};

export default nextConfig;
