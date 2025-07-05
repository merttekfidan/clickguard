import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          // UI libraries
          'ui-vendor': [
            '@radix-ui/react-dialog', 
            '@radix-ui/react-slot',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip'
          ],
          // Form and validation libraries
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Routing and state management
          'router-vendor': ['react-router-dom'],
          // Data fetching
          'query-vendor': ['@tanstack/react-query'],
          // Utility libraries
          'utils-vendor': ['clsx', 'class-variance-authority', 'tailwind-merge', 'date-fns'],
          // Chart and visualization
          'chart-vendor': ['recharts'],
          // Other UI components
          'ui-components': ['lucide-react', 'sonner', 'next-themes', 'cmdk', 'input-otp', 'embla-carousel-react', 'react-day-picker', 'react-resizable-panels', 'vaul', 'tailwindcss-animate']
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production'
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __DEV__: mode === 'development'
  }
}));
