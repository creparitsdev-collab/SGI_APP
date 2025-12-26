import React, { useState, useCallback } from 'react'
import { View, Text, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { useTheme } from 'heroui-native'

const ScrollableLayout = ({ children, onRefresh, contentContainerStyle }) => {
    const { colors } = useTheme()
    const [isRefreshing, setIsRefreshing] = useState(false)

    const handleRefresh = useCallback(async () => {
        if (!onRefresh) return

        setIsRefreshing(true)
        try {
            // Ejecuta la función de recarga y espera a que termine
            await onRefresh()
        } catch (error) {
            console.error('Error en ScrollableLayout refresh:', error)
        } finally {
            // Pequeño timeout para que la animación se sienta natural
            setTimeout(() => {
                setIsRefreshing(false)
            }, 500)
        }
    }, [onRefresh])

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAwareScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    ...contentContainerStyle,
                    padding: 0,
                    margin: 0,
                }}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid={true}
                refreshControl={
                    onRefresh ? (
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={[colors.accent]} // Android
                            tintColor={colors.accent} // iOS
                            progressBackgroundColor={colors.background}
                        />
                    ) : null
                }
            >
                {children}
            </KeyboardAwareScrollView>
        </SafeAreaView>
    )
}

export default ScrollableLayout
