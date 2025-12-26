import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Spinner, useTheme } from 'heroui-native'
import { useAuth } from '../contexts/AuthContext'
import AppNavigator from './AppNavigator'
import LoginScreen from '../screens/LoginScreen'
import { View } from 'react-native'

const Stack = createNativeStackNavigator()

const RootNavigator = () => {
    const { userToken, isLoading } = useAuth()
    const { colors } = useTheme()

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center">
                <Spinner color={colors.foreground} size="md" />
            </View>
        )
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {userToken == null ? (
                    // No hay token, mostrar pantalla de Login
                    <Stack.Screen name="Auth" component={LoginScreen} />
                ) : (
                    // Usuario logueado, mostrar el navegador de la App (que internamente decide por rol)
                    <Stack.Screen name="App" component={AppNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    )
}

export default RootNavigator
