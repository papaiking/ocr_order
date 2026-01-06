// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  nitro: {
    // Increase body size limit to handle large base64 images (50MB)
    // Adjust this value based on your needs
    maxRequestSize: 50 * 1024 * 1024 // 50MB in bytes
  }
})