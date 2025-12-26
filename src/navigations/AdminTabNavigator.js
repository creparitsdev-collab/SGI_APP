import React from 'react'
import { View } from 'react-native'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import { useTheme } from 'heroui-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import HomeScreen from '../screens/shared/HomeScreen'
import ProfileScreen from '../screens/shared/ProfileScreen'
import ProductsScreen from '../screens/shared/ProductsScreen'
import StockCataloguesScreen from '../screens/admin/StockCataloguesScreen'

const Tab = createMaterialTopTabNavigator()

const AdminTabNavigator = () => {
    const { colors } = useTheme()
    const insets = useSafeAreaInsets()

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Tab.Navigator
                tabBarPosition="bottom"
                screenOptions={({ route }) => ({
                    tabBarActiveTintColor: colors.accent,
                    tabBarInactiveTintColor: colors.mutedForeground,
                    tabBarLabelStyle: {
                        fontSize: 14,
                        fontWeight: '600',
                        textTransform: 'capitalize',
                        margin: 0,
                        marginTop: 4,
                    },
                    tabBarStyle: {
                        backgroundColor: colors.background,
                        elevation: 0,
                        shadowOpacity: 0,
                        borderTopWidth: 0,
                        borderTopColor: 'transparent',
                        borderBottomWidth: 0,
                        paddingBottom: insets.bottom,
                        height: 'auto',
                    },
                    tabBarIndicatorStyle: {
                        backgroundColor: 'transparent',
                        height: 0,
                    },
                    tabBarItemStyle: {
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingVertical: 8,
                    },
                    tabBarShowIcon: true,
                    tabBarIcon: ({ focused, color }) => {
                        let iconName
                        switch (route.name) {
                            case 'Inicio':
                                iconName = focused ? 'home' : 'home-outline'
                                break
                            case 'Productos':
                                iconName = focused ? 'cube' : 'cube-outline'
                                break
                            case 'Catalogos':
                                iconName = focused ? 'albums' : 'albums-outline'
                                break
                            case 'Perfil':
                                iconName = focused ? 'person' : 'person-outline'
                                break
                            default:
                                iconName = focused ? 'ellipse' : 'ellipse-outline'
                        }
                        return <Ionicons name={iconName} size={24} color={color} />
                    },
                })}
            >
                <Tab.Screen name="Inicio" component={HomeScreen} />
                <Tab.Screen name="Catalogos" component={StockCataloguesScreen} />
                <Tab.Screen name="Productos" component={ProductsScreen} />
                <Tab.Screen name="Perfil" component={ProfileScreen} />
            </Tab.Navigator>
        </View>
    )
}

export default AdminTabNavigator
