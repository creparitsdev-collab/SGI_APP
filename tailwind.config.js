const heroUINativePlugin = require('heroui-native/tailwind-plugin')

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        './App.{js,jsx,ts,tsx}',
        './src/**/*.{js,jsx,ts,tsx}',
        './components/**/*.{js,jsx,ts,tsx}',
        './app/**/*.{js,jsx,ts,tsx}',
        './node_modules/heroui-native/lib/**/*.{js,ts,jsx,tsx}',
    ],
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            fontFamily: {
                normal: ['PlusJakartaSans_400Regular'],
                medium: ['PlusJakartaSans_500Medium'],
                semibold: ['PlusJakartaSans_600SemiBold'],
                bold: ['PlusJakartaSans_700Bold'],
            },
        },
    },
    plugins: [heroUINativePlugin],
}
