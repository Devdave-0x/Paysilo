/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.alias = {
      ...config.resolve.alias,
      "@base-org/account": false,
      "@coinbase/cdp-sdk": false,
      "@coinbase/wallet-sdk": false,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};
export default nextConfig;
