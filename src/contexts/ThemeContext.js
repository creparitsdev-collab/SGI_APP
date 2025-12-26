import React, { createContext, useContext, useState, useEffect } from 'react'
import { useColorScheme as useRNColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const ThemeContext = createContext()

const THEME_STORAGE_KEY = '@app_theme_preference'

export const ThemeProvider = ({ children }) => {
    const systemColorScheme = useRNColorScheme()
    const [themePreference, setThemePreference] = useState('system') // 'light', 'dark', 'system'
    const [isLoading, setIsLoading] = useState(true)

    // Cargar preferencia guardada al iniciar
    useEffect(() => {
        const loadThemePreference = async () => {
            try {
                const savedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY)
                if (savedPreference) {
                    setThemePreference(savedPreference)
                }
            } catch (error) {
                console.error('Error loading theme preference:', error)
            } finally {
                setIsLoading(false)
            }
        }

        loadThemePreference()
    }, [])

    // Calcular el tema efectivo basado en la preferencia
    const getEffectiveTheme = () => {
        if (themePreference === 'system') {
            return systemColorScheme || 'light'
        }
        return themePreference
    }

    const effectiveTheme = getEffectiveTheme()

    // Guardar preferencia cuando cambia
    const updateThemePreference = async (preference) => {
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, preference)
            setThemePreference(preference)
        } catch (error) {
            console.error('Error saving theme preference:', error)
        }
    }

    // Toggle entre light y dark (ignora system)
    const toggleTheme = () => {
        const newPreference = effectiveTheme === 'dark' ? 'light' : 'dark'
        updateThemePreference(newPreference)
    }

    // Establecer preferencia específica
    const setTheme = (preference) => {
        if (['light', 'dark', 'system'].includes(preference)) {
            updateThemePreference(preference)
        }
    }

    const value = {
        themePreference,
        effectiveTheme,
        isDark: effectiveTheme === 'dark',
        systemColorScheme,
        toggleTheme,
        setTheme,
        isLoading,
    }

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useThemeContext = () => {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useThemeContext must be used within ThemeProvider')
    }
    return context
}
