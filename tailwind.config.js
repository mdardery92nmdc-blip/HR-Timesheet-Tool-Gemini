/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        streamlit: {
          bg: '#ffffff',
          sidebar: '#f0f2f6',
          primary: '#ff4b4b',
          blue: '#1f77b4',
          border: '#e6eaf1',
        }
      }
    },
  },
  plugins: [],
};
