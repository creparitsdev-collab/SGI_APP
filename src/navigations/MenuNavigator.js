import React from 'react'
import { View } from 'react-native'
import { createStackNavigator } from '@react-navigation/stack'
import { useTheme } from 'heroui-native'

import LogsScreen from '../screens/admin/LogsScreen'
import UsersScreen from '../screens/admin/UsersScreen'
import MenuScreen from '../screens/admin/MenuScreen'
import StockCataloguesScreen from '../screens/admin/StockCataloguesScreen'
import ProductStatusesScreen from '../screens/admin/ProductStatusesScreen'
import UnitsOfMeasurementScreen from '../screens/admin/UnitsOfMeasurementScreen'
import WarehouseTypesScreen from '../screens/admin/WarehouseTypesScreen'

const Stack = createStackNavigator()

const MenuNavigator = () => {
    const { colors } = useTheme()

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    animationEnabled: true,
                    cardStyle: { backgroundColor: colors.background },
                }}
            >
                <Stack.Screen name="MenuIndex" component={MenuScreen} />
                <Stack.Screen name="Usuarios" component={UsersScreen} />
                <Stack.Screen name="Logs" component={LogsScreen} />
                <Stack.Screen name="Estados" component={ProductStatusesScreen} />
                <Stack.Screen name="Catalogos" component={StockCataloguesScreen} />
                <Stack.Screen name="Unidades" component={UnitsOfMeasurementScreen} />
                <Stack.Screen name="TiposAlmacen" component={WarehouseTypesScreen} />
            </Stack.Navigator>
        </View>
    )
}

export default MenuNavigator
