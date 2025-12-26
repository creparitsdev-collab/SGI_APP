import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { Text, View, TouchableOpacity, Platform, Dimensions, ScrollView as RNScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import ScrollableLayout from '../../layouts/ScrollableLayout'
import { Button, Spinner, useTheme } from 'heroui-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Modalize } from 'react-native-modalize'
import { useAuth } from '../../contexts/AuthContext'
import { getProfile } from '../../services/user'
import { getProducts, getStockCatalogues, getProductStatuses } from '../../services/product'
import { getUsersRequest } from '../../services/user'
import { getProductByQrHash } from '../../services/product'
import { getWarehouseTypes } from '../../services/warehouseType'
import { getUnitsOfMeasurement } from '../../services/unitOfMeasurement'
import { CameraView, useCameraPermissions } from 'expo-camera'
import LogsScreen from '../admin/LogsScreen'
import UsersScreen from '../admin/UsersScreen'
import StockCataloguesScreen from '../admin/StockCataloguesScreen'
import ProductStatusesScreen from '../admin/ProductStatusesScreen'
import WarehouseTypesScreen from '../admin/WarehouseTypesScreen'
import UnitsOfMeasurementScreen from '../admin/UnitsOfMeasurementScreen'

const Stack = createStackNavigator()

const { height } = Dimensions.get('window')
const MODAL_MAX_HEIGHT = height * 0.75
const OVERLAY_STYLE = { backgroundColor: 'rgba(0, 0, 0, 0.4)' }
const MODAL_ANIMATION_PROPS = {
    openAnimationConfig: { timing: { duration: 450 } },
    closeAnimationConfig: { timing: { duration: 300 } },
    dragToss: 0.05,
    threshold: 120,
    useNativeDriver: true,
    adjustToContentHeight: true,
    avoidKeyboardLikeIOS: true,
    overlayStyle: OVERLAY_STYLE,
    handlePosition: 'inside',
}

// =====================================================================
// CUSTOM ALERT
// =====================================================================
const CustomAlert = forwardRef((_, ref) => {
    const { colors } = useTheme()
    const modalRef = useRef(null)
    const [alertConfig, setAlertConfig] = useState({
        title: '',
        message: '',
        type: 'success',
    })

    useImperativeHandle(ref, () => ({
        show: (title, message, type = 'success') => {
            setAlertConfig({ title, message, type })
            modalRef.current?.open()
        },
        close: () => {
            modalRef.current?.close()
        },
    }))

    const getConfig = () => {
        switch (alertConfig.type) {
            case 'error':
                return { icon: 'alert-outline', color: colors.danger, bgIcon: 'bg-danger/10' }
            case 'warning':
                return { icon: 'warning-outline', color: colors.warning, bgIcon: 'bg-warning/10' }
            case 'success':
            default:
                return { icon: 'checkmark-outline', color: colors.accent, bgIcon: 'bg-accent/10' }
        }
    }

    const config = getConfig()

    return (
        <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
            <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                <RNScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingHorizontal: '6%', paddingTop: '9%', paddingBottom: '6%' }}
                >
                    <View className="flex flex-col items-center justify-center">
                        <View className={`h-16 w-16 rounded-full items-center justify-center mb-4 ${config.bgIcon}`}>
                            <Ionicons name={config.icon} size={32} color={config.color} />
                        </View>
                        <Text className="text-foreground text-2xl font-medium mb-2 text-center">{alertConfig.title}</Text>
                        <Text className="text-muted-foreground text-center px-4 mb-8">{alertConfig.message}</Text>
                        <Button
                            onPress={() => modalRef.current?.close()}
                            className={
                                alertConfig.type === 'warning'
                                    ? 'bg-warning w-full text-warning-foreground'
                                    : alertConfig.type === 'error'
                                      ? 'bg-danger w-full text-danger-foreground'
                                      : 'bg-accent w-full text-accent-foreground'
                            }
                        >
                            <Button.Label>Entendido</Button.Label>
                        </Button>
                    </View>
                </RNScrollView>
            </View>
        </Modalize>
    )
})

// =====================================================================
// QR SCANNER MODAL
// =====================================================================
const QrScannerModalContent = ({ modalRef, alertRef, navigation }) => {
    const { colors } = useTheme()
    const [permission, requestPermission] = useCameraPermissions()
    const [scanned, setScanned] = useState(false)

    useEffect(() => {
        if (permission === null) {
            requestPermission()
        }
    }, [permission])

    const handleBarCodeScanned = async ({ data }) => {
        if (scanned) return
        setScanned(true)
        try {
            const response = await getProductByQrHash(data)
            if (response?.data) {
                modalRef.current?.close()
                setTimeout(() => {
                    navigation.navigate('Productos', { scannedProduct: response.data })
                }, 300)
            } else {
                alertRef.current?.show('Error', 'Producto no encontrado', 'error')
                setScanned(false)
            }
        } catch (error) {
            console.error('Error scanning QR:', error)
            alertRef.current?.show('Error', 'No se pudo obtener el producto', 'error')
            setScanned(false)
        }
    }

    const onClose = () => {
        setScanned(false)
        modalRef.current?.close()
    }

    const resetScan = () => {
        setScanned(false)
    }

    if (permission === null) {
        return (
            <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
                <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <View className="p-[6%] items-center justify-center" style={{ minHeight: 300 }}>
                        <Spinner color={colors.accent} size="lg" />
                        <Text className="text-foreground mt-4">Solicitando permisos de cámara...</Text>
                    </View>
                </View>
            </Modalize>
        )
    }

    if (!permission.granted) {
        return (
            <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
                <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <View className="p-[6%] items-center justify-center" style={{ minHeight: 300 }}>
                        <Ionicons name="camera-outline" size={64} color={colors.muted} />
                        <Text className="text-foreground text-lg font-medium mt-4 text-center">Permisos de cámara requeridos</Text>
                        <Text className="text-muted-foreground text-center mt-2 px-4">Necesitamos acceso a tu cámara para escanear códigos QR</Text>
                        <Button className="mt-6 bg-accent" onPress={requestPermission}>
                            <Button.Label>Conceder permisos</Button.Label>
                        </Button>
                        <Button className="mt-3 bg-transparent" onPress={onClose}>
                            <Button.Label>Cancelar</Button.Label>
                        </Button>
                    </View>
                </View>
            </Modalize>
        )
    }

    return (
        <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
            <View style={{ maxHeight: MODAL_MAX_HEIGHT, flex: 1 }}>
                <View className="p-[6%]">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-foreground text-xl font-medium">Escanear código QR</Text>
                        <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                            <Ionicons name="close-outline" size={24} color={colors.foreground} />
                        </Button>
                    </View>
                    <View className="aspect-square w-[100%] rounded-lg overflow-hidden">
                        <CameraView
                            style={{ flex: 1 }}
                            facing="back"
                            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                            barcodeScannerSettings={{
                                barcodeTypes: ['qr'],
                            }}
                        />
                    </View>
                    <Text className="text-muted-foreground text-center mt-4">Apunta la cámara hacia el código QR del producto</Text>
                    {scanned && (
                        <Button className="mt-4 bg-accent" onPress={resetScan}>
                            <Ionicons name="refresh-outline" size={24} color={colors.accentForeground} />
                            <Button.Label>Escanear otro código</Button.Label>
                        </Button>
                    )}
                </View>
            </View>
        </Modalize>
    )
}

// =====================================================================
// COMPONENTES DE UI
// =====================================================================
const Header = ({ userProfile, colors }) => {
    const greeting = () => {
        const hour = new Date().getHours()
        return hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
    }

    return (
        <View className="rounded-b-[32px] overflow-hidden">
            <LinearGradient colors={[colors.background, colors.accentSoft]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.5 }}>
                <View className="px-[6%] pt-[9%] pb-[6%]">
                    <Text className="text-foreground text-2xl font-medium mb-2">{greeting()},</Text>
                    <Text className="text-foreground text-[32px] font-bold">{userProfile?.name ? userProfile.name : 'Usuario'}</Text>
                </View>
            </LinearGradient>
        </View>
    )
}

const StatCard = ({ icon, label, value, color, onPress, loading, subtitle }) => (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} className="flex-row items-center p-4 bg-accent-soft rounded-lg">
        <View className="h-12 w-12 rounded-full items-center justify-center mr-4">
            <Ionicons name={icon} size={24} color={color} />
        </View>
        <View className="flex-1">
            <Text className="text-foreground font-medium text-lg mb-0.5">{label}</Text>
            <Text className="text-muted-foreground text-[14px]">{subtitle ? subtitle : 'Ver detalles'}</Text>
        </View>
        <View className="mr-3">{loading ? <Spinner size="sm" color={color} /> : <Text className="text-2xl font-medium text-foreground">{value}</Text>}</View>
        <Ionicons name="chevron-forward-outline" size={24} color={color} />
    </TouchableOpacity>
)

const QuickAccessCard = ({ icon, title, subtitle, onPress, color }) => (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} className="flex-row items-center p-4 bg-accent-soft rounded-lg">
        <View className="h-12 w-12 rounded-full items-center justify-center mr-4">
            <Ionicons name={icon} size={24} color={color} />
        </View>
        <View className="flex-1">
            <Text className="text-foreground font-medium text-lg mb-1">{title}</Text>
            <Text className="text-muted-foreground text-[14px]" numberOfLines={1}>
                {subtitle}
            </Text>
        </View>
        <Ionicons name="chevron-forward-outline" size={24} color={color} />
    </TouchableOpacity>
)

const HeroButton = ({ onPress, color, colors }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} className="rounded-lg p-4 flex-row items-center shadow-sm" style={{ backgroundColor: color }}>
        <View className="h-16 w-16 rounded-lg items-center justify-center mr-4">
            <Ionicons name="scan-outline" size={32} color={colors.accentForeground} />
        </View>
        <View className="flex-1">
            <Text className="text-accent-foreground font-medium text-lg mb-1">Escanear código QR</Text>
            <Text className="text-muted text-[14px]" numberOfLines={1}>
                Búsqueda rápida por QR
            </Text>
        </View>
        <Ionicons name="chevron-forward-outline" size={24} color={colors.accentForeground} />
    </TouchableOpacity>
)

// =====================================================================
// HOME SCREEN MAIN (Ahora es la pantalla índice)
// =====================================================================
const HomeScreenIndex = () => {
    const { colors } = useTheme()
    const { userRole } = useAuth()
    const navigation = useNavigation()
    const [isLoading, setIsLoading] = useState(true)
    const [userProfile, setUserProfile] = useState(null)
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalProducts: 0,
        totalCatalogues: 0,
        totalStatuses: 0,
        totalWarehouseTypes: 0,
        totalUnitsOfMeasurement: 0,
    })
    const qrScannerModalRef = useRef(null)
    const alertRef = useRef(null)

    const isAdmin = userRole === 'ADMIN' || userRole === '1'

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true)
            const promises = [getProfile(), getProducts(0, 1), getStockCatalogues(0, 1), getProductStatuses(), getWarehouseTypes(), getUnitsOfMeasurement()]
            if (isAdmin) promises.push(getUsersRequest())
            else promises.push(Promise.resolve(null))

            const [profileRes, productsRes, cataloguesRes, statusesRes, warehouseTypesRes, unitsRes, usersRes] = await Promise.allSettled(promises)

            if (profileRes.status === 'fulfilled') setUserProfile(profileRes.value?.data || profileRes.value)

            const getCount = (res) => {
                const data = res.value?.data
                return Array.isArray(data) ? data.length : data?.totalElements || data?.content?.length || 0
            }

            setStats({
                totalProducts: productsRes.status === 'fulfilled' ? getCount(productsRes) : 0,
                totalCatalogues: cataloguesRes.status === 'fulfilled' ? getCount(cataloguesRes) : 0,
                totalStatuses: statusesRes.status === 'fulfilled' ? getCount(statusesRes) : 0,
                totalWarehouseTypes: warehouseTypesRes.status === 'fulfilled' ? getCount(warehouseTypesRes) : 0,
                totalUnitsOfMeasurement: unitsRes.status === 'fulfilled' ? getCount(unitsRes) : 0,
                totalUsers: isAdmin && usersRes.status === 'fulfilled' ? getCount(usersRes) : 0,
            })
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const openQrScanner = () => {
        requestAnimationFrame(() => {
            qrScannerModalRef.current?.open()
        })
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollableLayout onRefresh={fetchDashboardData}>
                <Header userProfile={userProfile} colors={colors} />
                <View className="p-[6%] gap-4">
                    <HeroButton onPress={openQrScanner} color={colors.accent} colors={colors} />
                    <View>
                        <View className="gap-2">
                            {isAdmin && (
                                <>
                                    <StatCard
                                        icon="people-outline"
                                        label="Usuarios"
                                        subtitle="Gestionar usuarios y accesos"
                                        value={stats.totalUsers}
                                        color={colors.accent}
                                        onPress={() => navigation.navigate('Usuarios')}
                                        loading={isLoading}
                                    />
                                    <StatCard
                                        icon="albums-outline"
                                        label="Catálogos"
                                        subtitle="Configurar catálogos de stock"
                                        value={stats.totalCatalogues}
                                        color={colors.accent}
                                        onPress={() => navigation.navigate('Catalogos')}
                                        loading={isLoading}
                                    />
                                    <StatCard
                                        subtitle="Gestión de inventario global"
                                        icon="cube-outline"
                                        label="Productos"
                                        value={stats.totalProducts}
                                        color={colors.accent}
                                        onPress={() => navigation.navigate('Productos')}
                                        loading={isLoading}
                                    />
                                    <QuickAccessCard
                                        icon="footsteps-outline"
                                        title="Logs"
                                        subtitle="Auditoría y registro de actividad"
                                        onPress={() => navigation.navigate('Logs')}
                                        color={colors.accent}
                                    />
                                    <StatCard
                                        icon="shield-outline"
                                        label="Estados"
                                        subtitle="Configurar estados de productos"
                                        value={stats.totalStatuses}
                                        color={colors.accent}
                                        onPress={() => navigation.navigate('Estados')}
                                        loading={isLoading}
                                    />
                                    <StatCard
                                        icon="business-outline"
                                        label="Almacenes"
                                        subtitle="Gestionar tipos de almacén"
                                        value={stats.totalWarehouseTypes}
                                        color={colors.accent}
                                        onPress={() => navigation.navigate('Almacenes')}
                                        loading={isLoading}
                                    />
                                    <StatCard
                                        icon="scale-outline"
                                        label="Unidades"
                                        subtitle="Gestionar unidades de medida"
                                        value={stats.totalUnitsOfMeasurement}
                                        color={colors.accent}
                                        onPress={() => navigation.navigate('Unidades')}
                                        loading={isLoading}
                                    />
                                </>
                            )}
                            <QuickAccessCard
                                icon="person-outline"
                                title="Perfil"
                                subtitle="Ver información personal"
                                onPress={() => navigation.navigate('Perfil')}
                                color={colors.accent}
                            />
                        </View>
                    </View>
                </View>
            </ScrollableLayout>
            <QrScannerModalContent modalRef={qrScannerModalRef} alertRef={alertRef} navigation={navigation} />
            <CustomAlert ref={alertRef} />
        </View>
    )
}

// =====================================================================
// STACK NAVIGATOR (HomeScreen es ahora un Stack Navigator)
// =====================================================================
const HomeScreen = () => {
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
                <Stack.Screen name="HomeIndex" component={HomeScreenIndex} />
                <Stack.Screen name="Usuarios" component={UsersScreen} />
                <Stack.Screen name="Logs" component={LogsScreen} />
                <Stack.Screen name="Estados" component={ProductStatusesScreen} />
                <Stack.Screen name="Almacenes" component={WarehouseTypesScreen} />
                <Stack.Screen name="Unidades" component={UnitsOfMeasurementScreen} />
            </Stack.Navigator>
        </View>
    )
}

export default HomeScreen
