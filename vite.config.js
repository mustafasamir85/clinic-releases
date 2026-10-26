import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // تحميل متغيرات البيئة بناءً على الـ mode الحالي
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: '/Clinic-Managment/',
    server: {
      proxy: {
        '/api': {
          // سيقوم بقراءة الرابط من ملف الـ env أو استخدام المنفذ الافتراضي
          target: env.VITE_API_URL || 'http://127.0.0.1:8000', 
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})