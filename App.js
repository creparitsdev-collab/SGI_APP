import './global.css'
import RootNavigator from './src/navigations/RootNavigator'
import { HeroUINativeProvider, Spinner } from 'heroui-native'
import { AuthProvider } from './src/contexts/AuthContext'
import { ThemeProvider, useThemeContext } from './src/contexts/ThemeContext'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useEffect } from 'react'
import { useColorScheme } from 'nativewind'

import {
    useFonts,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { View } from 'react-native'

// Componente interno que usa el contexto de tema
const AppContent = () => {
    const { effectiveTheme, isLoading: themeLoading, isDark } = useThemeContext()
    const { setColorScheme } = useColorScheme()

    // Sincronizar NativeWind con el tema efectivo
    useEffect(() => {
        setColorScheme(effectiveTheme)
    }, [effectiveTheme, setColorScheme])

    let [fontsLoaded] = useFonts({
        PlusJakartaSans_400Regular,
        PlusJakartaSans_500Medium,
        PlusJakartaSans_600SemiBold,
        PlusJakartaSans_700Bold,
    })

    if (!fontsLoaded || themeLoading) {
        return (
            <View className={`flex-1 justify-center items-center bg-background ${isDark ? 'dark' : ''}`}>
                <Spinner size="md" />
            </View>
        )
    }

    return (
        <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }} className={isDark ? 'dark' : ''}>
                <HeroUINativeProvider
                    config={{
                        colorScheme: effectiveTheme,
                        theme: {
                            // ---------
                            // LIGHT MODE - Pure White Base (INTACTO)
                            // ---------
                            light: {
                                colors: {
                                    // Base (Blanco Puro)
                                    background: '#FFFFFF',
                                    foreground: '#000000',
                                    panel: '#FFFFFF',

                                    // Muted
                                    muted: '#A3A3A3',
                                    mutedForeground: '#525252',

                                    // Surface
                                    surface: '#FFFFFF',
                                    surfaceForeground: '#000000',
                                    default: '#FFFFFF',
                                    defaultForeground: '#000000',

                                    // Superficies elevadas
                                    surface1: '#F5F5F5', // Igual a accentSoft
                                    surface2: '#EEEEEE',
                                    surface3: '#E0E0E0',

                                    // Bordes
                                    border: '#E5E5E5',
                                    divider: '#F5F5F5',

                                    // Brand colors
                                    accent: '#171717',
                                    accentForeground: '#FFFFFF',
                                    accentSoft: '#F5F5F5', // Igual a surface1
                                    accentSoftForeground: '#171717',
                                },
                                borderRadius: {
                                    DEFAULT: '12px',
                                    panel: '8px',
                                    'panel-inner': '4px',
                                },
                                opacity: {
                                    disabled: 0.4,
                                },
                            },

                            // ---------
                            // DARK MODE - Pure Black Base (CORREGIDO)
                            // ---------
                            dark: {
                                colors: {
                                    // Base (Negro Puro)
                                    background: '#000000',
                                    foreground: '#FFFFFF',
                                    panel: '#000000',

                                    // Muted
                                    muted: '#525252',
                                    mutedForeground: '#A3A3A3',

                                    // Surface
                                    surface: '#000000',
                                    surfaceForeground: '#FFFFFF',
                                    default: '#000000',
                                    defaultForeground: '#FFFFFF',

                                    // Superficies elevadas (Inversión ajustada)
                                    // surface1 ahora es #171717 para coincidir con accentSoft
                                    surface1: '#171717',
                                    surface2: '#262626',
                                    surface3: '#404040',

                                    // Bordes y divisores
                                    border: '#262626',
                                    divider: '#171717',

                                    // Brand colors
                                    accent: '#FFFFFF',
                                    accentForeground: '#000000',
                                    // accentSoft ahora es #171717 para coincidir con surface1
                                    accentSoft: '#171717',
                                    accentSoftForeground: '#FFFFFF',
                                },
                                borderRadius: {
                                    DEFAULT: '12px',
                                    panel: '8px',
                                    'panel-inner': '4px',
                                },
                                opacity: {
                                    disabled: 0.4,
                                },
                            },
                        },
                        textProps: {
                            minimumFontScale: 0.5,
                            maxFontSizeMultiplier: 1.5,
                        },
                    }}
                >
                    <AuthProvider>
                        <RootNavigator />
                    </AuthProvider>
                </HeroUINativeProvider>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    )
}

// Componente principal que envuelve con ThemeProvider
export default function App() {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    )
}
