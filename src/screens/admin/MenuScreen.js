import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useTheme } from 'heroui-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import ScrollableLayout from '../../layouts/ScrollableLayout'

const MenuScreen = () => {
    const { colors } = useTheme()
    const navigation = useNavigation()

    const menuItems = [
        {
            id: 'users',
            title: 'Usuarios',
            subtitle: 'Gestionar roles y accesos',
            icon: 'people-outline',
            route: 'Usuarios',
        },
        {
            id: 'logs',
            title: 'Logs del Sistema',
            subtitle: 'Auditoría y registro de actividad',
            icon: 'footsteps-outline',
            route: 'Logs',
        },
        {
            id: 'statuses',
            title: 'Estados',
            subtitle: 'Configurar estados de productos',
            icon: 'shield-outline',
            route: 'Estados',
        },
        {
            id: 'catalogues',
            title: 'Catálogos',
            subtitle: 'Configurar catálogos de stock',
            icon: 'albums-outline',
            route: 'Catalogos',
        },
        {
            id: 'units',
            title: 'Unidades de Medida',
            subtitle: 'Configurar unidades de medición',
            icon: 'scale-outline',
            route: 'Unidades',
        },
        {
            id: 'warehouseTypes',
            title: 'Tipos de Almacén',
            subtitle: 'Configurar tipos de almacenamiento',
            icon: 'business-outline',
            route: 'TiposAlmacen',
        },
    ]

    return (
        <ScrollableLayout>
            <View className="p-[6%] h-full">
                {/* Header */}
                <View className="mb-4 h-14 justify-center">
                    <Text className="font-bold text-[28px] text-foreground mb-1">Ajustes</Text>
                </View>

                {/* Lista de opciones */}
                <View className="gap-4">
                    <View className="gap-2">
                        {menuItems.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate(item.route)}
                                className="flex-row items-center p-4 bg-accent-soft rounded-lg"
                            >
                                {/* Icono */}
                                <View className="h-12 w-12 rounded-full items-center justify-center mr-4">
                                    <Ionicons name={item.icon} size={24} color={colors.accent} />
                                </View>

                                {/* Texto */}
                                <View className="flex-1">
                                    <Text className="text-foreground font-medium text-lg mb-1">{item.title}</Text>
                                    <Text className="text-muted-foreground text-[14px]" numberOfLines={1}>
                                        {item.subtitle}
                                    </Text>
                                </View>

                                {/* Flecha */}
                                <Ionicons name="chevron-forward-outline" size={24} color={colors.accent} />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View className="flex-row items-center p-4 bg-accent-soft rounded-lg">
                        <View className="h-12 w-12 items-center justify-center mr-4">
                            <Ionicons name="information-outline" size={24} color={colors.mutedForeground} />
                        </View>

                        <View className="flex-1">
                            <Text className="text-muted-foreground text-[14px]">Estos ajustes solo están disponibles para administradores</Text>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollableLayout>
    )
}

export default MenuScreen
