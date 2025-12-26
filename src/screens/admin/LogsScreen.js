import React, { useEffect, useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react'
import { Text, View, TouchableOpacity, Platform, Dimensions } from 'react-native'
import ScrollableLayout from '../../layouts/ScrollableLayout'
import { Accordion, Button, RadioGroup, ScrollShadow, Spinner, TextField, useTheme } from 'heroui-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { formatDateLiteral } from '../../utils/utils'
import { Modalize } from 'react-native-modalize'
import { ScrollView } from 'react-native-gesture-handler'
import BackButton from '../../components/BackButton'
import { getAuditLogs, getAuditLogsByUserEmail } from '../../services/audit'

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

const InfoRow = ({ label, value, valueClassName = '' }) => (
    <View className="flex-row items-start justify-between">
        <Text className="text-[14px] text-muted-foreground w-24 pt-0.5">{label}</Text>
        <Text className={`text-[14px] text-right flex-1 font-medium ${valueClassName ? valueClassName : 'text-foreground'}`} numberOfLines={10}>
            {value}
        </Text>
    </View>
)

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
                <ScrollView
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
                </ScrollView>
            </View>
        </Modalize>
    )
})

// =====================================================================
// MODAL DE FILTROS
// =====================================================================
const FiltersModalContent = ({ modalRef, sortOption, setSortOption, rowsPerPage, setRowsPerPage, setPage }) => {
    const { colors } = useTheme()

    const onClose = () => modalRef.current?.close()

    const sortOptions = [
        { label: 'Fecha', value: 'createdAt' },
        { label: 'Usuario', value: 'userEmail' },
        { label: 'Acción', value: 'action' },
    ]

    const rowsOptions = [
        { label: '5 filas', value: '5' },
        { label: '10 filas', value: '10' },
        { label: '20 filas', value: '20' },
        { label: '50 filas', value: '50' },
    ]

    const handleSortChange = (val) => {
        const selectedLabel = sortOptions.find((opt) => opt.value === val)?.label
        setSortOption({ value: val, label: selectedLabel })
    }

    const RenderRadioItem = ({ value, label }) => (
        <RadioGroup.Item value={value} className="-my-0.5 flex-row items-center p-4 bg-accent-soft rounded-lg border-0">
            <View className="flex-1">
                <RadioGroup.Title className="text-foreground font-medium text-lg">{label}</RadioGroup.Title>
            </View>
            <RadioGroup.Indicator />
        </RadioGroup.Item>
    )

    return (
        <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
            <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: '6%', paddingTop: '9%', paddingBottom: '6%' }}>
                    <View className="flex gap-0 mb-8">
                        <View className="flex flex-row justify-between items-center">
                            <Text className="text-foreground text-2xl font-medium">Opciones</Text>
                            <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                <Ionicons name="close-outline" size={24} color={colors.foreground} />
                            </Button>
                        </View>
                        <Text className="text-muted-foreground">Ordena y filtra tus resultados</Text>
                    </View>

                    <View className="gap-6">
                        {/* ORDENAR POR */}
                        <View>
                            <View className="mb-0">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Ordenar por</Text>
                            </View>
                            <RadioGroup value={sortOption.value} onValueChange={handleSortChange}>
                                {sortOptions.map((opt) => (
                                    <RenderRadioItem key={opt.value} value={opt.value} label={opt.label} />
                                ))}
                            </RadioGroup>
                        </View>

                        {/* FILAS POR PÁGINA */}
                        <View>
                            <View className="mb-0">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Filas por página</Text>
                            </View>
                            <RadioGroup
                                value={rowsPerPage}
                                onValueChange={(val) => {
                                    setRowsPerPage(val)
                                    setPage(1)
                                }}
                            >
                                {rowsOptions.map((opt) => (
                                    <RenderRadioItem key={opt.value} value={opt.value} label={opt.label} />
                                ))}
                            </RadioGroup>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </Modalize>
    )
}

// =====================================================================
// PANTALLA PRINCIPAL - LOGS SCREEN
// =====================================================================
const LogsScreen = () => {
    const [isLoading, setIsLoading] = useState(true)
    const [logs, setLogs] = useState([])
    const { colors } = useTheme()

    // Estados de filtros
    const [searchValue, setSearchValue] = useState('')
    const [sortOption, setSortOption] = useState({ value: 'createdAt', label: 'Fecha' })
    const [rowsPerPage, setRowsPerPage] = useState('10')
    const [page, setPage] = useState(1)

    // Referencias para Modales
    const filterModalRef = useRef(null)
    const alertRef = useRef(null)

    // Handlers para abrir modales
    const openFilterModal = () => filterModalRef.current?.open()

    const fetchData = async () => {
        try {
            setIsLoading(true)
            // El backend devuelve directamente una lista, no un objeto con data
            const list = await getAuditLogs()
            setLogs(Array.isArray(list) ? list : [])
        } catch (err) {
            console.error('Error fetch:', err)
            alertRef.current?.show('Error', 'No se pudieron cargar los logs', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        setPage(1)
    }, [searchValue, rowsPerPage])

    const filteredAndSortedItems = useMemo(() => {
        let result = [...logs]

        // Filtro de búsqueda
        if (searchValue) {
            const lowerSearch = searchValue.toLowerCase()
            result = result.filter(
                (log) =>
                    log.userEmail?.toLowerCase().includes(lowerSearch) ||
                    log.userName?.toLowerCase().includes(lowerSearch) ||
                    log.action?.toLowerCase().includes(lowerSearch),
            )
        }

        // Ordenamiento
        if (sortOption?.value) {
            const key = sortOption.value
            result.sort((a, b) => {
                const aVal = a[key]
                const bVal = b[key]
                if (key === 'timestamp' || key === 'createdAt') {
                    return new Date(bVal || 0) - new Date(aVal || 0)
                }
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return aVal - bVal
                }
                const aStr = (aVal || '').toString().toLowerCase()
                const bStr = (bVal || '').toString().toLowerCase()
                return aStr.localeCompare(bStr)
            })
        }

        return result
    }, [logs, searchValue, sortOption])

    const pages = Math.ceil(filteredAndSortedItems.length / Number(rowsPerPage))

    const paginatedItems = useMemo(() => {
        const start = (page - 1) * Number(rowsPerPage)
        return filteredAndSortedItems.slice(start, start + Number(rowsPerPage))
    }, [page, filteredAndSortedItems, rowsPerPage])

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        try {
            return formatDateLiteral(dateString, true)
        } catch {
            try {
                return new Date(dateString).toLocaleString('es-MX')
            } catch {
                return 'N/A'
            }
        }
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollableLayout onRefresh={fetchData}>
                <View className="p-[6%] min-h-full">
                    <View className="flex flex-col w-full justify-between shrink-0 gap-4 items-end">
                        <View className="w-full flex flex-row justify-between items-center">
                            <View className="flex flex-row items-center justify-center gap-2">
                                <BackButton />
                                <Text className="font-bold text-[32px] text-foreground">Logs</Text>
                            </View>
                            <View className="flex flex-row gap-0 items-center">
                                <Button isIconOnly className="size-12 bg-transparent shrink-0" isDisabled={isLoading} onPress={openFilterModal}>
                                    <Ionicons name="filter-outline" size={24} color={colors.foreground} />
                                </Button>
                            </View>
                        </View>
                    </View>

                    <View className="mb-4 mt-4 flex-row justify-between items-center">
                        <Text className="text-[14px] text-muted-foreground">{filteredAndSortedItems.length} Resultados</Text>
                        <View className="flex flex-row gap-2">
                            <View className="flex-row items-center bg-surface-1 px-2 py-2 rounded-full gap-1">
                                <Ionicons name="swap-vertical-outline" size={12} color={colors.foreground} />
                                <Text className="text-xs font-semibold text-foreground">{sortOption.label}</Text>
                            </View>
                            <View className="flex-row items-center bg-surface-1 px-2 py-2 rounded-lg">
                                <Text className="text-xs font-semibold text-foreground">{rowsPerPage} / Pág</Text>
                            </View>
                        </View>
                    </View>

                    <TextField className="mb-4">
                        <TextField.Input
                            colors={{
                                blurBackground: colors.accentSoft,
                                focusBackground: colors.surface2,
                                blurBorder: colors.accentSoft,
                                focusBorder: colors.surface2,
                            }}
                            placeholder="Buscar por usuario, acción o detalles..."
                            autoCapitalize="none"
                            cursorColor={colors.accent}
                            selectionHandleColor={colors.accent}
                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                            value={searchValue}
                            onChangeText={setSearchValue}
                        >
                            <TextField.InputEndContent>
                                <Ionicons name="search-outline" size={24} color={colors.muted} />
                            </TextField.InputEndContent>
                        </TextField.Input>
                    </TextField>

                    {isLoading ? (
                        <View className="absolute inset-0 justify-center items-center z-50">
                            <Spinner color={colors.foreground} size="md" />
                        </View>
                    ) : (
                        <ScrollShadow className="w-full" size={20} LinearGradientComponent={LinearGradient}>
                            <View className="p-0">
                                {paginatedItems.length > 0 ? (
                                    <>
                                        <Accordion selectionMode="single" className="border-0" isDividerVisible={false}>
                                            {paginatedItems.map((item, index) => (
                                                <Accordion.Item
                                                    key={item.id || index}
                                                    value={item.id || index}
                                                    className="bg-accent-soft mb-2 rounded-lg overflow-hidden border border-border/20"
                                                >
                                                    {/* HEADER / TRIGGER */}
                                                    <Accordion.Trigger className="w-full bg-accent-soft pl-4 pr-0 py-2">
                                                        <View className="flex-row items-center justify-between w-full">
                                                            {/* TEXTOS */}
                                                            <View className="flex-1 pr-2 justify-center py-1">
                                                                <Text className="text-foreground font-medium text-lg mb-1" numberOfLines={1}>
                                                                    {item.action || 'Sin acción'}
                                                                </Text>
                                                                <Text className="text-muted-foreground text-[14px]" numberOfLines={1}>
                                                                    {item.userEmail || 'Usuario desconocido'}
                                                                </Text>
                                                            </View>

                                                            {/* INDICADOR */}
                                                            <View className="w-12 h-12 flex items-center justify-center">
                                                                <Accordion.Indicator
                                                                    iconProps={{
                                                                        color: colors.accent,
                                                                        size: 24,
                                                                    }}
                                                                />
                                                            </View>
                                                        </View>
                                                    </Accordion.Trigger>

                                                    {/* CONTENT */}
                                                    <Accordion.Content className="bg-accent-soft px-4 pb-4">
                                                        <View className="h-px bg-border/30 mt-0 mb-3" />
                                                        <View className="gap-2">
                                                            <InfoRow label="Usuario" value={item.userName || item.userEmail || 'N/A'} />
                                                            <InfoRow label="Email" value={item.userEmail || 'N/A'} />
                                                            <InfoRow label="Acción" value={item.action || 'N/A'} />
                                                            <InfoRow label="Fecha" value={formatDate(item.createdAt)} />
                                                        </View>
                                                    </Accordion.Content>
                                                </Accordion.Item>
                                            ))}
                                        </Accordion>

                                        {/* Paginación */}
                                        {pages > 1 && (
                                            <View className="items-end mt-2">
                                                <View className="flex-row items-center justify-between rounded-lg">
                                                    <Button
                                                        isIconOnly
                                                        className="bg-transparent"
                                                        isDisabled={page === 1}
                                                        onPress={() => setPage((p) => Math.max(1, p - 1))}
                                                    >
                                                        <Ionicons name="chevron-back-outline" size={24} color={page === 1 ? colors.muted : colors.accent} />
                                                        <Text className="text-foreground">{page}</Text>
                                                    </Button>
                                                    <Button
                                                        isIconOnly
                                                        className="bg-transparent"
                                                        isDisabled={page === pages || pages === 0}
                                                        onPress={() => setPage((p) => Math.min(pages, p + 1))}
                                                    >
                                                        <Text className="text-muted-foreground">/ {pages || 1}</Text>
                                                        <Ionicons
                                                            name="chevron-forward-outline"
                                                            size={24}
                                                            color={page === pages || pages === 0 ? colors.muted : colors.accent}
                                                        />
                                                    </Button>
                                                </View>
                                            </View>
                                        )}
                                    </>
                                ) : (
                                    <View className="items-center justify-center py-12">
                                        <Ionicons name="document-text-outline" size={64} color={colors.muted} />
                                        <Text className="text-muted-foreground text-lg mt-4">No se encontraron logs</Text>
                                        <Text className="text-muted-foreground text-center mt-2 px-8">
                                            {searchValue ? 'Intente con otros términos de búsqueda' : 'No hay registros de auditoría disponibles'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </ScrollShadow>
                    )}
                </View>
            </ScrollableLayout>

            {/* MODALES */}
            <FiltersModalContent
                modalRef={filterModalRef}
                sortOption={sortOption}
                setSortOption={setSortOption}
                rowsPerPage={rowsPerPage}
                setRowsPerPage={setRowsPerPage}
                setPage={setPage}
            />
            <CustomAlert ref={alertRef} />
        </View>
    )
}

export default LogsScreen
