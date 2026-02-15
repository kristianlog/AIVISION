/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'twinkle': 'twinkle 2s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { 
            opacity: '0.3', 
            transform: 'scale(1)' 
          },
          '50%': { 
            opacity: '1', 
            transform: 'scale(1.2)' 
          },
        },
        float: {
          '0%, 100%': { 
            transform: 'translateY(0px) translateX(0px)' 
          },
          '33%': { 
            transform: 'translateY(-20px) translateX(10px)' 
          },
          '66%': { 
            transform: 'translateY(10px) translateX(-10px)' 
          },
        }
      },
      backdropBlur: {
        'xl': '24px',
      }
    },
  },
  plugins: [],
}