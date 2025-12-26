import { Button, useTheme } from 'heroui-native'
import { Text, View, Modal } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated'
import { useThemeContext } from '../contexts/ThemeContext'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const ThemeSwitcher = () => {
    const { colors } = useTheme()
    const { toggleTheme, isDark } = useThemeContext()
    const [showOverlay, setShowOverlay] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)

    const rotation = useSharedValue(0)

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${rotation.value}deg` }],
        }
    })

    const handleThemeToggle = async () => {
        if (isAnimating) return
        setIsAnimating(true)
        setShowOverlay(true)
        await delay(100)
        rotation.value = withTiming(rotation.value + 360, {
            duration: 1000,
            easing: Easing.inOut(Easing.cubic),
        })
        await delay(250)
        toggleTheme()
        await delay(600)
        setShowOverlay(false)
        setIsAnimating(false)
    }

    return (
        <View className="flex flex-col gap-4">
            <Modal
                transparent={false} // false = ocupa toda la pantalla
                animationType="fade" // fundido suave
                visible={showOverlay}
            >
                <View className="flex-1 justify-center items-center bg-background transition-colors duration-700">
                    <Animated.View style={animatedStyle}>
                        <Ionicons
                            name={isDark ? 'moon' : 'sunny'} // Icono actual basado en el tema
                            size={24} // Tamaño del icono
                            color={colors.foreground} // Color basado en el tema
                        />
                    </Animated.View>
                </View>
            </Modal>

            <Button isIconOnly className="bg-transparent shrink-0" onPress={handleThemeToggle}>
                <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={24} color={colors.foreground} />
            </Button>

            <StatusBar style={isDark ? 'light' : 'dark'} />
        </View>
    )
}

export default ThemeSwitcher
