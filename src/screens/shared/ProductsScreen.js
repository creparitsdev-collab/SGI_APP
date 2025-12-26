import React, { useEffect, useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react'
import { Text, View, TouchableOpacity, Platform, Dimensions, Image, StyleSheet, Alert, Pressable } from 'react-native'
import { useRoute, useFocusEffect } from '@react-navigation/native'
import ScrollableLayout from '../../layouts/ScrollableLayout'
import { Accordion, Button, RadioGroup, ScrollShadow, Spinner, TextField, useTheme } from 'heroui-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { formatDateLiteral, formatDateStringToShort, formatDateToLocalString } from '../../utils/utils'
import { Modalize } from 'react-native-modalize'
import { ScrollView } from 'react-native-gesture-handler'
import { required, validPositiveNumber, validDate } from '../../utils/validators'
import { CameraView, useCameraPermissions } from 'expo-camera'
import DateTimePicker from '@react-native-community/datetimepicker'

// SOLUCIÓN: Imports estáticos aquí arriba
import * as FileSystem from 'expo-file-system/legacy'
import * as MediaLibrary from 'expo-media-library'
import * as Sharing from 'expo-sharing'

// Servicios
import { getProducts, createProduct, updateProduct, getStockCatalogues, getProductStatuses, getQrCodeImage, getProductByQrHash } from '../../services/product'
import { getUnitsOfMeasurement } from '../../services/unitOfMeasurement'
import { getWarehouseTypes } from '../../services/warehouseType'
import { useAuth } from '../../contexts/AuthContext'

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
        <Text className={`text-[14px] text-right flex-1 font-medium ${valueClassName ? valueClassName : 'text-foreground'}`} numberOfLines={2}>
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
const FiltersModalContent = ({
    modalRef,
    sortOption,
    setSortOption,
    catalogueFilter,
    setCatalogueFilter,
    statusFilter,
    setStatusFilter,
    rowsPerPage,
    setRowsPerPage,
    setPage,
    catalogues,
    statuses,
}) => {
    const { colors } = useTheme()

    const onClose = () => modalRef.current?.close()

    const sortOptions = [
        { label: 'Nombre', value: 'nombre' },
        { label: 'Lote', value: 'lote' },
        { label: 'Código', value: 'codigo' },
        { label: 'Fecha', value: 'fecha' },
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

    // Componente auxiliar SIN ICONO
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

                        {/* FILTRAR POR CATÁLOGO */}
                        <View>
                            <View className="mb-0">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Filtrar por catálogo</Text>
                            </View>
                            <RadioGroup value={catalogueFilter} onValueChange={(val) => setCatalogueFilter(val)}>
                                <RenderRadioItem value="all" label="Todos los catálogos" />
                                {Array.isArray(catalogues) && catalogues.length > 0 ? (
                                    catalogues.map((cat) => <RenderRadioItem key={cat.id} value={String(cat.id)} label={cat.name} />)
                                ) : (
                                    <View className="p-4 items-center">
                                        <Text className="text-muted-foreground">No hay catálogos disponibles</Text>
                                    </View>
                                )}
                            </RadioGroup>
                        </View>

                        {/* FILTRAR POR ESTADO */}
                        <View>
                            <View className="mb-0">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Filtrar por estado</Text>
                            </View>
                            <RadioGroup value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                                <RenderRadioItem value="all" label="Todos los estados" />
                                {statuses.map((status) => (
                                    <RenderRadioItem key={status.id} value={String(status.id)} label={status.name} />
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
// MODAL VER CÓDIGO QR
// =====================================================================
const ViewQrModalContent = ({ modalRef, product, alertRef }) => {
    const { colors } = useTheme()
    const [qrImage, setQrImage] = useState(null)
    const [isLoadingQr, setIsLoadingQr] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)

    // Hook de permisos
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions()

    useEffect(() => {
        if (product?.qrHash) {
            loadQrImage()
        }
    }, [product])

    const loadQrImage = async () => {
        try {
            setIsLoadingQr(true)
            const imageBlob = await getQrCodeImage(product.qrHash)
            const reader = new FileReader()
            reader.onloadend = () => {
                setQrImage(reader.result)
            }
            reader.readAsDataURL(imageBlob)
        } catch (error) {
            console.error('Error loading QR:', error)
            alertRef.current?.show('Error', 'No se pudo cargar el código QR', 'error')
        } finally {
            setIsLoadingQr(false)
        }
    }

    const handleDownloadQr = async () => {
        if (!qrImage || !product) return

        try {
            setIsDownloading(true)

            // 1. Verificar Permisos explícitamente antes de procesar
            let permissionStatus = permissionResponse?.status

            if (permissionStatus !== 'granted') {
                const { status } = await requestPermission()
                permissionStatus = status
            }

            if (permissionStatus !== 'granted') {
                alertRef.current?.show('Permiso denegado', 'Se requieren permisos para guardar la imagen.', 'error')
                return
            }

            // 2. Preparar archivo
            // Limpiamos el nombre de caracteres que puedan dar error en el sistema de archivos
            const cleanName = product.nombre.replace(/[^a-zA-Z0-9]/g, '_')
            const fileName = `QR_${cleanName}_${product.lote}.png`
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`
            const base64Code = qrImage.includes(',') ? qrImage.split(',')[1] : qrImage

            // 3. Escribir archivo temporal
            await FileSystem.writeAsStringAsync(fileUri, base64Code, {
                encoding: FileSystem.EncodingType.Base64,
            })

            // 4. Crear el Asset (Esto guarda la imagen en "Recientes" / "Camera Roll")
            const asset = await MediaLibrary.createAssetAsync(fileUri)

            // 5. Intentar organizar en Álbum (Opcional - Manejo de error específico)
            try {
                const albumName = 'QR Codes'
                // Buscamos si el álbum ya existe
                const album = await MediaLibrary.getAlbumAsync(albumName)

                if (album) {
                    await MediaLibrary.addAssetsToAlbumAsync([asset], album, false)
                } else {
                    await MediaLibrary.createAlbumAsync(albumName, asset, false)
                }
            } catch (albumError) {
                // Si falla el álbum (ej. usuario deniega "modify"), no importa gravemente
                // porque el asset YA se creó en el paso 4.
                console.log('No se pudo agregar al álbum específico, pero la imagen existe en Recientes.')
            }

            alertRef.current?.show('Éxito', 'Código QR guardado en galería', 'success')
        } catch (error) {
            console.error('Error downloading QR:', error)
            alertRef.current?.show('Error', 'No se pudo guardar la imagen', 'error')
        } finally {
            setIsDownloading(false)
        }
    }

    const onClose = () => modalRef.current?.close()

    return (
        <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
            <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingHorizontal: '6%', paddingTop: '9%', paddingBottom: '6%' }}
                >
                    {product ? (
                        <>
                            <View className="flex gap-0 mb-8">
                                <View className="flex flex-row justify-between items-center">
                                    <Text className="text-foreground text-2xl font-medium">Código QR</Text>
                                    <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                        <Ionicons name="close-outline" size={24} color={colors.foreground} />
                                    </Button>
                                </View>
                                <Text className="text-muted-foreground">Código QR del producto</Text>
                            </View>
                            <View className="items-center gap-6">
                                <View className="bg-white p-1 rounded-lg">
                                    {isLoadingQr ? (
                                        <View className="w-64 h-64 items-center justify-center">
                                            <Spinner color={colors.accent} size="lg" />
                                        </View>
                                    ) : qrImage ? (
                                        <Image source={{ uri: qrImage }} style={{ width: 256, height: 256 }} resizeMode="contain" />
                                    ) : (
                                        <View className="w-64 h-64 items-center justify-center bg-surface-1 rounded-lg">
                                            <Ionicons name="qr-code-outline" size={64} color={colors.muted} />
                                            <Text className="text-muted-foreground mt-4">No disponible</Text>
                                        </View>
                                    )}
                                </View>
                                <View className="w-full gap-2">
                                    <InfoRow label="Producto" value={product.nombre} />
                                    <InfoRow label="Lote" value={product.lote} />
                                    <InfoRow label="Código" value={product.codigo} />
                                </View>
                                <Button className="w-full bg-accent mt-4" onPress={handleDownloadQr} isDisabled={isLoadingQr || !qrImage || isDownloading}>
                                    {isDownloading ? (
                                        <>
                                            <Spinner color={colors.accentForeground} size="sm" />
                                            <Button.Label>Descargando...</Button.Label>
                                        </>
                                    ) : (
                                        <>
                                            <Ionicons name="download-outline" size={24} color={colors.accentForeground} />
                                            <Button.Label>Descargar código QR</Button.Label>
                                        </>
                                    )}
                                </Button>
                            </View>
                        </>
                    ) : (
                        <View className="h-20" />
                    )}
                </ScrollView>
            </View>
        </Modalize>
    )
}

// Continuará en el siguiente mensaje con CreateProductModal...
// =====================================================================
// MODAL DE CREACIÓN DE PRODUCTO
// =====================================================================
const CreateProductModalContent = ({ modalRef, onProductCreated, isLoading, alertRef, catalogues, statuses, unitsOfMeasurement, warehouseTypes }) => {
    const { colors } = useTheme()
    const catalogueModalRef = useRef(null)
    const statusModalRef = useRef(null)
    const unidadMedidaModalRef = useRef(null)
    const warehouseTypeModalRef = useRef(null)

    const [isSaving, setIsSaving] = useState(false)
    const [showDatePickerIngreso, setShowDatePickerIngreso] = useState(false)
    const [showDatePickerCaducidad, setShowDatePickerCaducidad] = useState(false)
    const [showDatePickerReanalisis, setShowDatePickerReanalisis] = useState(false)
    const [showDatePickerMuestreo, setShowDatePickerMuestreo] = useState(false)

    // Inicializar fechas con fecha actual
    const getTodayDateString = () => {
        const today = new Date()
        return formatDateToLocalString(today)
    }

    const [newProduct, setNewProduct] = useState({
        stockCatalogueId: '',
        productStatusId: '',
        unitOfMeasurementId: '',
        warehouseTypeId: '',
        nombre: '',
        codigoProducto: '',
        lote: '',
        loteProveedor: '',
        fabricante: '',
        distribuidor: '',
        fechaIngreso: getTodayDateString(),
        fechaCaducidad: getTodayDateString(),
        fechaMuestreo: getTodayDateString(),
        fechaReanalisis: getTodayDateString(),
        cantidad: '',
        numeroAnalisis: '',
        numeroContenedores: '',
    })

    const [productErrors, setProductErrors] = useState({
        stockCatalogueId: [],
        productStatusId: [],
        unitOfMeasurementId: [],
        warehouseTypeId: [],
        nombre: [],
        codigoProducto: [],
        lote: [],
        loteProveedor: [],
        fabricante: [],
        distribuidor: [],
        fechaIngreso: [],
        fechaCaducidad: [],
        fechaMuestreo: [],
        fechaReanalisis: [],
        cantidad: [],
        numeroAnalisis: [],
        numeroContenedores: [],
    })

    // Validadores
    const validators = {
        stockCatalogueId: [required],
        productStatusId: [required],
        unitOfMeasurementId: [required],
        warehouseTypeId: [required],
        nombre: [required],
        codigoProducto: [required],
        lote: [required],
        loteProveedor: [required],
        fabricante: [],
        distribuidor: [],
        fechaIngreso: [required, validDate],
        fechaCaducidad: [],
        fechaMuestreo: [],
        fechaReanalisis: [],
        cantidad: [required, validPositiveNumber],
        numeroAnalisis: [],
        numeroContenedores: [required, validPositiveNumber],
    }

    const runValidators = (value, fns) => fns.map((fn) => fn(value)).filter(Boolean)

    const handleInputChange = (field, value) => {
        setNewProduct((prev) => ({ ...prev, [field]: value }))
        const fns = validators[field] || []
        const errs = runValidators(value, fns)
        setProductErrors((prev) => ({ ...prev, [field]: errs }))
    }

    const onDateChange = (field, event, selectedDate) => {
        if (Platform.OS === 'android') {
            if (field === 'ingreso') setShowDatePickerIngreso(false)
            if (field === 'caducidad') setShowDatePickerCaducidad(false)
            if (field === 'muestreo') setShowDatePickerMuestreo(false)
            if (field === 'reanalisis') setShowDatePickerReanalisis(false)
        }

        if (event.type === 'set' && selectedDate) {
            // Usar formato local para evitar problemas de zona horaria
            const formattedDate = formatDateToLocalString(selectedDate)
            if (field === 'ingreso') {
                handleInputChange('fechaIngreso', formattedDate)
            } else if (field === 'caducidad') {
                handleInputChange('fechaCaducidad', formattedDate)
            } else if (field === 'muestreo') {
                handleInputChange('fechaMuestreo', formattedDate)
            } else if (field === 'reanalisis') {
                handleInputChange('fechaReanalisis', formattedDate)
            }
        } else {
            if (field === 'ingreso') setShowDatePickerIngreso(false)
            if (field === 'caducidad') setShowDatePickerCaducidad(false)
            if (field === 'muestreo') setShowDatePickerMuestreo(false)
            if (field === 'reanalisis') setShowDatePickerReanalisis(false)
        }
    }

    const onClose = () => {
        modalRef.current?.close()
        setNewProduct({
            stockCatalogueId: '',
            productStatusId: '',
            unitOfMeasurementId: '',
            warehouseTypeId: '',
            nombre: '',
            codigoProducto: '',
            lote: '',
            loteProveedor: '',
            fabricante: '',
            distribuidor: '',
            fechaIngreso: getTodayDateString(),
            fechaCaducidad: getTodayDateString(),
            fechaMuestreo: getTodayDateString(),
            fechaReanalisis: getTodayDateString(),
            cantidad: '',
            numeroAnalisis: '',
            numeroContenedores: '',
        })
        setProductErrors({
            stockCatalogueId: [],
            productStatusId: [],
            unitOfMeasurementId: [],
            warehouseTypeId: [],
            codigoProducto: [],
            lote: [],
            nombre: [],
            loteProveedor: [],
            fabricante: [],
            distribuidor: [],
            fechaIngreso: [],
            fechaCaducidad: [],
            fechaMuestreo: [],
            fechaReanalisis: [],
            cantidad: [],
            numeroAnalisis: [],
            numeroContenedores: [],
        })
        setShowDatePickerIngreso(false)
        setShowDatePickerCaducidad(false)
        setShowDatePickerMuestreo(false)
        setShowDatePickerReanalisis(false)
    }

    const getCatalogueName = (id) => {
        const cat = catalogues.find((c) => c.id === Number(id))
        return cat ? cat.name : 'Seleccionar catálogo'
    }

    const getStatusName = (id) => {
        const status = statuses.find((s) => s.id === Number(id))
        return status ? status.name : 'Seleccionar estado'
    }

    const getUnitOfMeasurementName = (id) => {
        if (!id) return 'Seleccionar unidad'
        const unit = unitsOfMeasurement.find((u) => u.id === Number(id))
        return unit ? `${unit.name} (${unit.code})` : 'Seleccionar unidad'
    }

    const getWarehouseTypeName = (id) => {
        if (!id) return 'Seleccionar tipo'
        const wt = warehouseTypes.find((w) => w.id === Number(id))
        return wt ? `${wt.code} - ${wt.name}` : 'Seleccionar tipo'
    }

    const handleCreate = async () => {
        // Validación final
        const stockCatalogueIdErrs = runValidators(newProduct.stockCatalogueId, validators.stockCatalogueId)
        const productStatusIdErrs = runValidators(newProduct.productStatusId, validators.productStatusId)
        const unitOfMeasurementIdErrs = runValidators(newProduct.unitOfMeasurementId, validators.unitOfMeasurementId)
        const warehouseTypeIdErrs = runValidators(newProduct.warehouseTypeId, validators.warehouseTypeId)
        const nombreErrs = runValidators(newProduct.nombre, validators.nombre)
        const codigoProductoErrs = runValidators(newProduct.codigoProducto, validators.codigoProducto)
        const loteErrs = runValidators(newProduct.lote, validators.lote)
        const loteProveedorErrs = runValidators(newProduct.loteProveedor, validators.loteProveedor)
        const fechaIngresoErrs = runValidators(newProduct.fechaIngreso, validators.fechaIngreso)
        const cantidadErrs = runValidators(newProduct.cantidad, validators.cantidad)
        const numeroContenedoresErrs = runValidators(newProduct.numeroContenedores, validators.numeroContenedores)

        if (
            stockCatalogueIdErrs.length > 0 ||
            productStatusIdErrs.length > 0 ||
            unitOfMeasurementIdErrs.length > 0 ||
            warehouseTypeIdErrs.length > 0 ||
            nombreErrs.length > 0 ||
            codigoProductoErrs.length > 0 ||
            loteErrs.length > 0 ||
            loteProveedorErrs.length > 0 ||
            fechaIngresoErrs.length > 0 ||
            cantidadErrs.length > 0 ||
            numeroContenedoresErrs.length > 0
        ) {
            setProductErrors({
                stockCatalogueId: stockCatalogueIdErrs,
                productStatusId: productStatusIdErrs,
                unitOfMeasurementId: unitOfMeasurementIdErrs,
                warehouseTypeId: warehouseTypeIdErrs,
                nombre: nombreErrs,
                codigoProducto: codigoProductoErrs,
                lote: loteErrs,
                loteProveedor: loteProveedorErrs,
                fabricante: [],
                distribuidor: [],
                fechaIngreso: fechaIngresoErrs,
                fechaCaducidad: [],
                fechaMuestreo: [],
                fechaReanalisis: [],
                cantidad: cantidadErrs,
                numeroAnalisis: [],
                numeroContenedores: numeroContenedoresErrs,
            })
            alertRef.current?.show('Atención', 'Por favor corrija los errores en el formulario.', 'warning')
            return
        }

        try {
            setIsSaving(true)

            const cantidadValue = Number(newProduct.cantidad)
            const productData = {
                stockCatalogueId: Number(newProduct.stockCatalogueId),
                productStatusId: Number(newProduct.productStatusId),
                unitOfMeasurementId: newProduct.unitOfMeasurementId ? Number(newProduct.unitOfMeasurementId) : null,
                warehouseTypeId: newProduct.warehouseTypeId ? Number(newProduct.warehouseTypeId) : null,
                nombre: newProduct.nombre.trim(),
                codigoProducto: newProduct.codigoProducto.trim() || null,
                lote: newProduct.lote.trim(),
                loteProveedor: newProduct.loteProveedor.trim() || null,
                fabricante: newProduct.fabricante.trim() || null,
                distribuidor: newProduct.distribuidor.trim() || null,
                fechaIngreso: newProduct.fechaIngreso.trim() || null,
                fechaCaducidad: newProduct.fechaCaducidad.trim() || null,
                fechaMuestreo: newProduct.fechaMuestreo.trim() || null,
                reanalisis: newProduct.fechaReanalisis.trim() || null,
                cantidad: cantidadValue,
                cantidadTotal: cantidadValue,
                numeroAnalisis: newProduct.numeroAnalisis.trim() || null,
                numeroContenedores: Number(newProduct.numeroContenedores),
            }

            await createProduct(productData)
            onClose()
            setTimeout(() => {
                alertRef.current?.show('Éxito', 'Producto creado correctamente', 'success')
            }, 300)
            if (onProductCreated) onProductCreated()
        } catch (error) {
            console.error('Error create product:', error)
            if (error.response?.data) {
                const { result, title } = error.response.data
                alertRef.current?.show('Error', title || 'Error al crear producto', 'error')

                if (result && Array.isArray(result) && result?.length > 0) {
                    const newFieldErrors = {
                        stockCatalogueId: [],
                        productStatusId: [],
                        unitOfMeasurementId: [],
                        warehouseTypeId: [],
                        nombre: [],
                        codigoProducto: [],
                        lote: [],
                        loteProveedor: [],
                        fabricante: [],
                        distribuidor: [],
                        fechaIngreso: [],
                        fechaCaducidad: [],
                        fechaMuestreo: [],
                        fechaReanalisis: [],
                        cantidad: [],
                        numeroAnalisis: [],
                        numeroContenedores: [],
                    }
                    result.forEach((validationError) => {
                        const field = validationError.field
                        const descriptions = validationError.descriptions || []
                        if (newFieldErrors.hasOwnProperty(field)) {
                            newFieldErrors[field] = descriptions
                        }
                    })
                    setProductErrors(newFieldErrors)
                }
            } else {
                alertRef.current?.show('Error', 'No se pudo crear el producto', 'error')
            }
        } finally {
            setIsSaving(false)
        }
    }

    const hasErrors = () => {
        return (
            productErrors.stockCatalogueId.length > 0 ||
            productErrors.productStatusId.length > 0 ||
            productErrors.unitOfMeasurementId.length > 0 ||
            productErrors.warehouseTypeId.length > 0 ||
            productErrors.nombre.length > 0 ||
            productErrors.codigoProducto.length > 0 ||
            productErrors.lote.length > 0 ||
            productErrors.loteProveedor.length > 0 ||
            productErrors.fechaIngreso.length > 0 ||
            productErrors.cantidad.length > 0 ||
            productErrors.numeroContenedores.length > 0 ||
            !newProduct.stockCatalogueId ||
            !newProduct.productStatusId ||
            !newProduct.unitOfMeasurementId ||
            !newProduct.warehouseTypeId ||
            !newProduct.nombre.trim() ||
            !newProduct.codigoProducto.trim() ||
            !newProduct.lote.trim() ||
            !newProduct.loteProveedor.trim() ||
            !newProduct.fechaIngreso ||
            !newProduct.cantidad ||
            !newProduct.numeroContenedores
        )
    }

    // ... return ( ...
    return (
        <>
            <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
                <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingHorizontal: '6%', paddingTop: '9%', paddingBottom: '6%' }}
                    >
                        <View className="flex gap-0 mb-8">
                            <View className="flex flex-row justify-between items-center">
                                <Text className="text-foreground text-2xl font-medium">Registrar producto</Text>
                                <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                    <Ionicons name="close-outline" size={24} color={colors.foreground} />
                                </Button>
                            </View>
                            <Text className="text-muted-foreground">Ingrese los datos del nuevo producto</Text>
                        </View>

                        <View className="gap-6">
                            {/* CATÁLOGO */}
                            <View>
                                <Text className="text-foreground font-medium mb-2">
                                    Catálogo <Text className="text-danger">*</Text>
                                </Text>
                                <TouchableOpacity onPress={() => catalogueModalRef.current?.open()}>
                                    <View className="w-full h-12 flex-row items-center justify-between px-4 rounded-lg bg-accent-soft">
                                        <Text className="text-foreground font-medium">{getCatalogueName(newProduct.stockCatalogueId)}</Text>
                                        <Ionicons name="chevron-down-outline" size={24} color={colors.accent} />
                                    </View>
                                </TouchableOpacity>
                                {productErrors.stockCatalogueId.length > 0 ? (
                                    <Text className="text-danger text-sm mt-1">{productErrors.stockCatalogueId.join('\n')}</Text>
                                ) : null}
                            </View>

                            {/* ESTADO */}
                            <View>
                                <Text className="text-foreground font-medium mb-2">
                                    Estado <Text className="text-danger">*</Text>
                                </Text>
                                <TouchableOpacity onPress={() => statusModalRef.current?.open()}>
                                    <View className="w-full h-12 flex-row items-center justify-between px-4 rounded-lg bg-accent-soft">
                                        <Text className="text-foreground font-medium">{getStatusName(newProduct.productStatusId)}</Text>
                                        <Ionicons name="chevron-down-outline" size={24} color={colors.accent} />
                                    </View>
                                </TouchableOpacity>
                                {productErrors.productStatusId.length > 0 ? (
                                    <Text className="text-danger text-sm mt-1">{productErrors.productStatusId.join('\n')}</Text>
                                ) : null}
                            </View>

                            {/* NOMBRE */}
                            <TextField isRequired isInvalid={productErrors.nombre.length > 0}>
                                <View className="flex-row justify-between items-center mb-2">
                                    <TextField.Label className="text-foreground font-medium">Nombre</TextField.Label>
                                    <Text className="text-muted-foreground text-xs">{newProduct.nombre.length} / 200</Text>
                                </View>
                                <TextField.Input
                                    colors={{
                                        blurBackground: colors.accentSoft,
                                        focusBackground: colors.surface2,
                                        blurBorder: productErrors.nombre.length > 0 ? colors.danger : colors.accentSoft,
                                        focusBorder: productErrors.nombre.length > 0 ? colors.danger : colors.surface2,
                                    }}
                                    placeholder="Nombre del producto"
                                    value={newProduct.nombre}
                                    onChangeText={(text) => handleInputChange('nombre', text)}
                                    cursorColor={colors.accent}
                                    selectionHandleColor={colors.accent}
                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                    maxLength={200}
                                >
                                    <TextField.InputEndContent>
                                        {productErrors.nombre.length === 0 && newProduct.nombre.trim() ? (
                                            <Ionicons name="checkmark" size={24} color={colors.accent} />
                                        ) : productErrors.nombre.length > 0 ? (
                                            <Ionicons name="close" size={24} color={colors.danger} />
                                        ) : null}
                                    </TextField.InputEndContent>
                                </TextField.Input>
                                {productErrors.nombre.length > 0 ? (
                                    <TextField.ErrorMessage>{productErrors.nombre.join('\n')}</TextField.ErrorMessage>
                                ) : undefined}
                            </TextField>

                            {/* LOTE */}
                            <TextField isRequired isInvalid={productErrors.lote.length > 0}>
                                <View className="flex-row justify-between items-center mb-2">
                                    <TextField.Label className="text-foreground font-medium">Lote</TextField.Label>
                                    <Text className="text-muted-foreground text-xs">{newProduct.lote.length} / 100</Text>
                                </View>
                                <TextField.Input
                                    colors={{
                                        blurBackground: colors.accentSoft,
                                        focusBackground: colors.surface2,
                                        blurBorder: productErrors.lote.length > 0 ? colors.danger : colors.accentSoft,
                                        focusBorder: productErrors.lote.length > 0 ? colors.danger : colors.surface2,
                                    }}
                                    placeholder="Número de lote"
                                    value={newProduct.lote}
                                    onChangeText={(text) => handleInputChange('lote', text)}
                                    cursorColor={colors.accent}
                                    selectionHandleColor={colors.accent}
                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                    maxLength={100}
                                >
                                    <TextField.InputEndContent>
                                        {productErrors.lote.length === 0 && newProduct.lote.trim() ? (
                                            <Ionicons name="checkmark" size={24} color={colors.accent} />
                                        ) : productErrors.lote.length > 0 ? (
                                            <Ionicons name="close" size={24} color={colors.danger} />
                                        ) : null}
                                    </TextField.InputEndContent>
                                </TextField.Input>
                                {productErrors.lote.length > 0 ? <TextField.ErrorMessage>{productErrors.lote.join('\n')}</TextField.ErrorMessage> : undefined}
                            </TextField>

                            {/* CÓDIGO PRODUCTO */}
                            <TextField isRequired isInvalid={productErrors.codigoProducto.length > 0}>
                                <View className="flex-row justify-between items-center mb-2">
                                    <TextField.Label className="text-foreground font-medium">Código del producto</TextField.Label>
                                    <Text className="text-muted-foreground text-xs">{newProduct.codigoProducto.length} / 50</Text>
                                </View>
                                <TextField.Input
                                    colors={{
                                        blurBackground: colors.accentSoft,
                                        focusBackground: colors.surface2,
                                        blurBorder: productErrors.codigoProducto.length > 0 ? colors.danger : colors.accentSoft,
                                        focusBorder: productErrors.codigoProducto.length > 0 ? colors.danger : colors.surface2,
                                    }}
                                    placeholder="Código del producto"
                                    value={newProduct.codigoProducto}
                                    onChangeText={(text) => handleInputChange('codigoProducto', text)}
                                    cursorColor={colors.accent}
                                    selectionHandleColor={colors.accent}
                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                    maxLength={50}
                                >
                                    <TextField.InputEndContent>
                                        {productErrors.codigoProducto.length === 0 && newProduct.codigoProducto.trim() ? (
                                            <Ionicons name="checkmark" size={24} color={colors.accent} />
                                        ) : productErrors.codigoProducto.length > 0 ? (
                                            <Ionicons name="close" size={24} color={colors.danger} />
                                        ) : null}
                                    </TextField.InputEndContent>
                                </TextField.Input>
                                {productErrors.codigoProducto.length > 0 ? (
                                    <TextField.ErrorMessage>{productErrors.codigoProducto.join('\n')}</TextField.ErrorMessage>
                                ) : undefined}
                            </TextField>

                            {/* FECHA INGRESO */}
                            <TextField isRequired isInvalid={productErrors.fechaIngreso.length > 0}>
                                <TextField.Label className="text-foreground font-medium mb-2">Fecha de ingreso</TextField.Label>
                                <Pressable onPress={() => setShowDatePickerIngreso(true)}>
                                    <View pointerEvents="none">
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: productErrors.fechaIngreso.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: productErrors.fechaIngreso.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="12/DIC/2025"
                                            value={newProduct.fechaIngreso ? formatDateStringToShort(newProduct.fechaIngreso) : ''}
                                            editable={false}
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                        >
                                            <TextField.InputEndContent>
                                                <Ionicons name="calendar-outline" size={24} color={colors.accent} />
                                            </TextField.InputEndContent>
                                        </TextField.Input>
                                    </View>
                                </Pressable>
                                {productErrors.fechaIngreso.length > 0 ? (
                                    <TextField.ErrorMessage>{productErrors.fechaIngreso.join('\n')}</TextField.ErrorMessage>
                                ) : undefined}
                                {showDatePickerIngreso && (
                                    <DateTimePicker
                                        testID="dateTimePickerIngreso"
                                        value={newProduct.fechaIngreso ? new Date(newProduct.fechaIngreso) : new Date()}
                                        mode="date"
                                        is24Hour={true}
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event, selectedDate) => onDateChange('ingreso', event, selectedDate)}
                                    />
                                )}
                            </TextField>

                            {/* FECHA CADUCIDAD */}
                            <TextField isInvalid={productErrors.fechaCaducidad.length > 0}>
                                <TextField.Label className="text-foreground font-medium mb-2">Fecha de caducidad</TextField.Label>
                                <Pressable onPress={() => setShowDatePickerCaducidad(true)}>
                                    <View pointerEvents="none">
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: productErrors.fechaCaducidad.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: productErrors.fechaCaducidad.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="12/DIC/2025"
                                            value={newProduct.fechaCaducidad ? formatDateStringToShort(newProduct.fechaCaducidad) : ''}
                                            editable={false}
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                        >
                                            <TextField.InputEndContent>
                                                <Ionicons name="calendar-outline" size={24} color={colors.accent} />
                                            </TextField.InputEndContent>
                                        </TextField.Input>
                                    </View>
                                </Pressable>
                                {productErrors.fechaCaducidad.length > 0 ? (
                                    <TextField.ErrorMessage>{productErrors.fechaCaducidad.join('\n')}</TextField.ErrorMessage>
                                ) : undefined}
                                {showDatePickerCaducidad && (
                                    <DateTimePicker
                                        testID="dateTimePickerCaducidad"
                                        value={newProduct.fechaCaducidad ? new Date(newProduct.fechaCaducidad) : new Date()}
                                        mode="date"
                                        is24Hour={true}
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event, selectedDate) => onDateChange('caducidad', event, selectedDate)}
                                    />
                                )}
                            </TextField>

                            {/* FECHA REANÁLISIS */}
                            <TextField isInvalid={productErrors.fechaReanalisis.length > 0}>
                                <TextField.Label className="text-foreground font-medium mb-2">Fecha de reanálisis</TextField.Label>
                                <Pressable onPress={() => setShowDatePickerReanalisis(true)}>
                                    <View pointerEvents="none">
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: productErrors.fechaReanalisis.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: productErrors.fechaReanalisis.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="12/DIC/2025"
                                            value={newProduct.fechaReanalisis ? formatDateStringToShort(newProduct.fechaReanalisis) : ''}
                                            editable={false}
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                        >
                                            <TextField.InputEndContent>
                                                <Ionicons name="calendar-outline" size={24} color={colors.accent} />
                                            </TextField.InputEndContent>
                                        </TextField.Input>
                                    </View>
                                </Pressable>
                                {productErrors.fechaReanalisis.length > 0 ? (
                                    <TextField.ErrorMessage>{productErrors.fechaReanalisis.join('\n')}</TextField.ErrorMessage>
                                ) : undefined}
                                {showDatePickerReanalisis && (
                                    <DateTimePicker
                                        testID="dateTimePickerReanalisis"
                                        value={newProduct.fechaReanalisis ? new Date(newProduct.fechaReanalisis) : new Date()}
                                        mode="date"
                                        is24Hour={true}
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event, selectedDate) => onDateChange('reanalisis', event, selectedDate)}
                                    />
                                )}
                            </TextField>

                            <TextField isInvalid={productErrors.fechaMuestreo.length > 0}>
                                <TextField.Label className="text-foreground font-medium mb-2">Fecha de muestreo</TextField.Label>
                                <Pressable onPress={() => setShowDatePickerMuestreo(true)}>
                                    <View pointerEvents="none">
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: productErrors.fechaMuestreo.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: productErrors.fechaMuestreo.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="12/DIC/2025"
                                            value={newProduct.fechaMuestreo ? formatDateStringToShort(newProduct.fechaMuestreo) : ''}
                                            editable={false}
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                        >
                                            <TextField.InputEndContent>
                                                <Ionicons name="calendar-outline" size={24} color={colors.accent} />
                                            </TextField.InputEndContent>
                                        </TextField.Input>
                                    </View>
                                </Pressable>
                                {productErrors.fechaMuestreo.length > 0 ? (
                                    <TextField.ErrorMessage>{productErrors.fechaMuestreo.join('\n')}</TextField.ErrorMessage>
                                ) : undefined}
                                {showDatePickerMuestreo && (
                                    <DateTimePicker
                                        testID="dateTimePickerMuestreo"
                                        value={newProduct.fechaMuestreo ? new Date(newProduct.fechaMuestreo) : new Date()}
                                        mode="date"
                                        is24Hour={true}
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event, selectedDate) => onDateChange('muestreo', event, selectedDate)}
                                    />
                                )}
                            </TextField>

                            {/* LOTE PROVEEDOR */}
                            <TextField isRequired isInvalid={productErrors.loteProveedor.length > 0}>
                                <View className="flex-row justify-between items-center mb-2">
                                    <TextField.Label className="text-foreground font-medium">Lote de proveedor</TextField.Label>
                                    <Text className="text-muted-foreground text-xs">{newProduct.loteProveedor.length} / 100</Text>
                                </View>
                                <TextField.Input
                                    colors={{
                                        blurBackground: colors.accentSoft,
                                        focusBackground: colors.surface2,
                                        blurBorder: productErrors.loteProveedor.length > 0 ? colors.danger : colors.accentSoft,
                                        focusBorder: productErrors.loteProveedor.length > 0 ? colors.danger : colors.surface2,
                                    }}
                                    placeholder="Lote del proveedor"
                                    value={newProduct.loteProveedor}
                                    onChangeText={(text) => handleInputChange('loteProveedor', text)}
                                    cursorColor={colors.accent}
                                    selectionHandleColor={colors.accent}
                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                    maxLength={100}
                                />
                                {productErrors.loteProveedor.length > 0 ? (
                                    <TextField.ErrorMessage>{productErrors.loteProveedor.join('\n')}</TextField.ErrorMessage>
                                ) : undefined}
                            </TextField>

                            {/* FABRICANTE */}
                            <TextField isInvalid={productErrors.fabricante.length > 0}>
                                <View className="flex-row justify-between items-center mb-2">
                                    <TextField.Label className="text-foreground font-medium">Fabricante (Opcional)</TextField.Label>
                                    <Text className="text-muted-foreground text-xs">{newProduct.fabricante.length} / 200</Text>
                                </View>
                                <TextField.Input
                                    colors={{
                                        blurBackground: colors.accentSoft,
                                        focusBackground: colors.surface2,
                                        blurBorder: productErrors.fabricante.length > 0 ? colors.danger : colors.accentSoft,
                                        focusBorder: productErrors.fabricante.length > 0 ? colors.danger : colors.surface2,
                                    }}
                                    placeholder="Nombre del fabricante"
                                    value={newProduct.fabricante}
                                    onChangeText={(text) => handleInputChange('fabricante', text)}
                                    cursorColor={colors.accent}
                                    selectionHandleColor={colors.accent}
                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                    maxLength={200}
                                />
                                {productErrors.fabricante.length > 0 ? (
                                    <TextField.ErrorMessage>{productErrors.fabricante.join('\n')}</TextField.ErrorMessage>
                                ) : undefined}
                            </TextField>

                            {/* DISTRIBUIDOR */}
                            <TextField isInvalid={productErrors.distribuidor.length > 0}>
                                <View className="flex-row justify-between items-center mb-2">
                                    <TextField.Label className="text-foreground font-medium">Distribuidor (Opcional)</TextField.Label>
                                    <Text className="text-muted-foreground text-xs">{newProduct.distribuidor.length} / 200</Text>
                                </View>
                                <TextField.Input
                                    colors={{
                                        blurBackground: colors.accentSoft,
                                        focusBackground: colors.surface2,
                                        blurBorder: productErrors.distribuidor.length > 0 ? colors.danger : colors.accentSoft,
                                        focusBorder: productErrors.distribuidor.length > 0 ? colors.danger : colors.surface2,
                                    }}
                                    placeholder="Nombre del distribuidor"
                                    value={newProduct.distribuidor}
                                    onChangeText={(text) => handleInputChange('distribuidor', text)}
                                    cursorColor={colors.accent}
                                    selectionHandleColor={colors.accent}
                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                    maxLength={200}
                                />
                                {productErrors.distribuidor.length > 0 ? (
                                    <TextField.ErrorMessage>{productErrors.distribuidor.join('\n')}</TextField.ErrorMessage>
                                ) : undefined}
                            </TextField>

                            {/* UNIDAD DE MEDIDA */}
                            <View>
                                <Text className="text-foreground font-medium mb-2">
                                    Unidad de medida <Text className="text-danger">*</Text>
                                </Text>
                                <TouchableOpacity onPress={() => unidadMedidaModalRef.current?.open()}>
                                    <View className="w-full h-12 flex-row items-center justify-between px-4 rounded-lg bg-accent-soft">
                                        <Text className="text-foreground font-medium">{getUnitOfMeasurementName(newProduct.unitOfMeasurementId)}</Text>
                                        <Ionicons name="chevron-down-outline" size={24} color={colors.accent} />
                                    </View>
                                </TouchableOpacity>
                                {productErrors.unitOfMeasurementId.length > 0 ? (
                                    <Text className="text-danger text-sm mt-1">{productErrors.unitOfMeasurementId.join('\n')}</Text>
                                ) : null}
                            </View>

                            {/* TIPO DE ALMACÉN */}
                            <View>
                                <Text className="text-foreground font-medium mb-2">
                                    Tipo de almacén <Text className="text-danger">*</Text>
                                </Text>
                                <TouchableOpacity onPress={() => warehouseTypeModalRef.current?.open()}>
                                    <View className="w-full h-12 flex-row items-center justify-between px-4 rounded-lg bg-accent-soft">
                                        <Text className="text-foreground font-medium">{getWarehouseTypeName(newProduct.warehouseTypeId)}</Text>
                                        <Ionicons name="chevron-down-outline" size={24} color={colors.accent} />
                                    </View>
                                </TouchableOpacity>
                                {productErrors.warehouseTypeId.length > 0 ? (
                                    <Text className="text-danger text-sm mt-1">{productErrors.warehouseTypeId.join('\n')}</Text>
                                ) : null}
                            </View>

                            {/* CANTIDAD TOTAL */}
                            <TextField isRequired isInvalid={productErrors.cantidad.length > 0}>
                                <TextField.Label className="text-foreground font-medium mb-2">Cantidad total</TextField.Label>
                                <TextField.Input
                                    colors={{
                                        blurBackground: colors.accentSoft,
                                        focusBackground: colors.surface2,
                                        blurBorder: productErrors.cantidad.length > 0 ? colors.danger : colors.accentSoft,
                                        focusBorder: productErrors.cantidad.length > 0 ? colors.danger : colors.surface2,
                                    }}
                                    placeholder="Ej: 500"
                                    value={newProduct.cantidad}
                                    onChangeText={(text) => handleInputChange('cantidad', text)}
                                    keyboardType="numeric"
                                    cursorColor={colors.accent}
                                    selectionHandleColor={colors.accent}
                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                >
                                    <TextField.InputEndContent>
                                        {productErrors.cantidad.length === 0 && newProduct.cantidad ? (
                                            <Ionicons name="checkmark" size={24} color={colors.accent} />
                                        ) : productErrors.cantidad.length > 0 ? (
                                            <Ionicons name="close" size={24} color={colors.danger} />
                                        ) : null}
                                    </TextField.InputEndContent>
                                </TextField.Input>
                                {productErrors.cantidad.length > 0 ? (
                                    <TextField.ErrorMessage>{productErrors.cantidad.join('\n')}</TextField.ErrorMessage>
                                ) : undefined}
                            </TextField>

                            {/* NÚMERO DE CONTENEDORES */}
                            <TextField isRequired isInvalid={productErrors.numeroContenedores.length > 0}>
                                <TextField.Label className="text-foreground font-medium mb-2">Número de contenedores</TextField.Label>
                                <TextField.Input
                                    colors={{
                                        blurBackground: colors.accentSoft,
                                        focusBackground: colors.surface2,
                                        blurBorder: productErrors.numeroContenedores.length > 0 ? colors.danger : colors.accentSoft,
                                        focusBorder: productErrors.numeroContenedores.length > 0 ? colors.danger : colors.surface2,
                                    }}
                                    placeholder="Ej: 10"
                                    value={newProduct.numeroContenedores}
                                    onChangeText={(text) => handleInputChange('numeroContenedores', text)}
                                    keyboardType="numeric"
                                    cursorColor={colors.accent}
                                    selectionHandleColor={colors.accent}
                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                >
                                    <TextField.InputEndContent>
                                        {productErrors.numeroContenedores.length === 0 && newProduct.numeroContenedores ? (
                                            <Ionicons name="checkmark" size={24} color={colors.accent} />
                                        ) : productErrors.numeroContenedores.length > 0 ? (
                                            <Ionicons name="close" size={24} color={colors.danger} />
                                        ) : null}
                                    </TextField.InputEndContent>
                                </TextField.Input>
                                {productErrors.numeroContenedores.length > 0 ? (
                                    <TextField.ErrorMessage>{productErrors.numeroContenedores.join('\n')}</TextField.ErrorMessage>
                                ) : undefined}
                            </TextField>

                            {/* NÚMERO DE ANÁLISIS */}
                            <TextField isInvalid={productErrors.numeroAnalisis.length > 0}>
                                <View className="flex-row justify-between items-center mb-2">
                                    <TextField.Label className="text-foreground font-medium">Número de análisis (Opcional)</TextField.Label>
                                    <Text className="text-muted-foreground text-xs">{newProduct.numeroAnalisis.length} / 50</Text>
                                </View>
                                <TextField.Input
                                    colors={{
                                        blurBackground: colors.accentSoft,
                                        focusBackground: colors.surface2,
                                        blurBorder: productErrors.numeroAnalisis.length > 0 ? colors.danger : colors.accentSoft,
                                        focusBorder: productErrors.numeroAnalisis.length > 0 ? colors.danger : colors.surface2,
                                    }}
                                    placeholder="Número de análisis"
                                    value={newProduct.numeroAnalisis}
                                    onChangeText={(text) => handleInputChange('numeroAnalisis', text)}
                                    cursorColor={colors.accent}
                                    selectionHandleColor={colors.accent}
                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                    maxLength={50}
                                />
                                {productErrors.numeroAnalisis.length > 0 ? (
                                    <TextField.ErrorMessage>{productErrors.numeroAnalisis.join('\n')}</TextField.ErrorMessage>
                                ) : undefined}
                            </TextField>
                        </View>

                        <View className="flex-row justify-end gap-3 pt-8">
                            <Button className="flex-1" variant="primary" onPress={handleCreate} isDisabled={isLoading || isSaving || hasErrors()}>
                                {isSaving ? (
                                    <>
                                        <Spinner color={colors.accentForeground} size="md" />
                                        <Button.Label>Registrando...</Button.Label>
                                    </>
                                ) : (
                                    <>
                                        <Ionicons name="add-outline" size={24} color={colors.accentForeground} />
                                        <Button.Label>Registrar</Button.Label>
                                    </>
                                )}
                            </Button>
                        </View>
                    </ScrollView>
                </View>
            </Modalize>
            <Modalize ref={catalogueModalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
                <View className="px-[6%] pt-[9%] pb-[6%]" style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <View className="flex gap-0 mb-8">
                        <View className="flex flex-row justify-between items-center">
                            <Text className="text-foreground text-2xl font-medium">Seleccionar catálogo</Text>
                            <Button isIconOnly className="bg-transparent shrink-0" onPress={() => catalogueModalRef.current?.close()}>
                                <Ionicons name="close-outline" size={24} color={colors.foreground} />
                            </Button>
                        </View>
                        <Text className="text-muted-foreground">Seleccione el catálogo del producto</Text>
                    </View>
                    <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
                        <View>
                            <View className="mb-0">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Catálogos disponibles</Text>
                            </View>
                            <RadioGroup value={String(newProduct.stockCatalogueId)} onValueChange={(val) => handleInputChange('stockCatalogueId', val)}>
                                {Array.isArray(catalogues) && catalogues.length > 0 ? (
                                    catalogues.map((cat) => (
                                        <RadioGroup.Item
                                            key={cat.id}
                                            value={String(cat.id)}
                                            className="-my-0.5 flex-row items-center p-4 bg-accent-soft rounded-lg border-0"
                                        >
                                            <View className="flex-1">
                                                <RadioGroup.Title className="text-foreground font-medium text-lg">{cat.name}</RadioGroup.Title>
                                            </View>
                                            <RadioGroup.Indicator />
                                        </RadioGroup.Item>
                                    ))
                                ) : (
                                    <View className="p-4 items-center">
                                        <Text className="text-muted-foreground">No hay catálogos disponibles</Text>
                                    </View>
                                )}
                            </RadioGroup>
                        </View>
                    </ScrollView>
                </View>
            </Modalize>

            {/* Modal de selección de estado */}
            <Modalize ref={statusModalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
                <View className="px-[6%] pt-[9%] pb-[6%]" style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <View className="flex gap-0 mb-8">
                        <View className="flex flex-row justify-between items-center">
                            <Text className="text-foreground text-2xl font-medium">Seleccionar estado</Text>
                            <Button isIconOnly className="bg-transparent shrink-0" onPress={() => statusModalRef.current?.close()}>
                                <Ionicons name="close-outline" size={24} color={colors.foreground} />
                            </Button>
                        </View>
                        <Text className="text-muted-foreground">Seleccione el estado del producto</Text>
                    </View>
                    <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
                        <View>
                            <View className="mb-0">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Estados disponibles</Text>
                            </View>
                            <RadioGroup value={String(newProduct.productStatusId)} onValueChange={(val) => handleInputChange('productStatusId', val)}>
                                {statuses.map((status) => (
                                    <RadioGroup.Item
                                        key={status.id}
                                        value={String(status.id)}
                                        className="-my-0.5 flex-row items-center p-4 bg-accent-soft rounded-lg border-0"
                                    >
                                        <View className="flex-1">
                                            <RadioGroup.Title className="text-foreground font-medium text-lg">{status.name}</RadioGroup.Title>
                                        </View>
                                        <RadioGroup.Indicator />
                                    </RadioGroup.Item>
                                ))}
                            </RadioGroup>
                        </View>
                    </ScrollView>
                </View>
            </Modalize>

            {/* Modal de selección de unidad de medida */}
            <Modalize ref={unidadMedidaModalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
                <View className="px-[6%] pt-[9%] pb-[6%]" style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <View className="flex gap-0 mb-8">
                        <View className="flex flex-row justify-between items-center">
                            <Text className="text-foreground text-2xl font-medium">Seleccionar unidad</Text>
                            <Button isIconOnly className="bg-transparent shrink-0" onPress={() => unidadMedidaModalRef.current?.close()}>
                                <Ionicons name="close-outline" size={24} color={colors.foreground} />
                            </Button>
                        </View>
                        <Text className="text-muted-foreground">Seleccione la unidad de medida</Text>
                    </View>
                    <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
                        <View>
                            <View className="mb-0">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Unidades disponibles</Text>
                            </View>
                            <RadioGroup
                                value={String(newProduct.unitOfMeasurementId || '')}
                                onValueChange={(val) => {
                                    handleInputChange('unitOfMeasurementId', val)
                                    unidadMedidaModalRef.current?.close()
                                }}
                            >
                                {Array.isArray(unitsOfMeasurement) && unitsOfMeasurement.length > 0 ? (
                                    unitsOfMeasurement.map((unit) => (
                                        <RadioGroup.Item
                                            key={unit.id}
                                            value={String(unit.id)}
                                            className="-my-0.5 flex-row items-center p-4 bg-accent-soft rounded-lg border-0"
                                        >
                                            <View className="flex-1">
                                                <RadioGroup.Title className="text-foreground font-medium text-lg">
                                                    {unit.name} ({unit.code})
                                                </RadioGroup.Title>
                                                {unit.description && <Text className="text-muted-foreground text-sm">{unit.description}</Text>}
                                            </View>
                                            <RadioGroup.Indicator />
                                        </RadioGroup.Item>
                                    ))
                                ) : (
                                    <View className="p-4 items-center">
                                        <Text className="text-muted-foreground">No hay unidades disponibles</Text>
                                    </View>
                                )}
                            </RadioGroup>
                        </View>
                    </ScrollView>
                </View>
            </Modalize>

            {/* Modal de selección de tipo de almacén */}
            <Modalize ref={warehouseTypeModalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
                <View className="px-[6%] pt-[9%] pb-[6%]" style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <View className="flex gap-0 mb-8">
                        <View className="flex flex-row justify-between items-center">
                            <Text className="text-foreground text-2xl font-medium">Seleccionar tipo</Text>
                            <Button isIconOnly className="bg-transparent shrink-0" onPress={() => warehouseTypeModalRef.current?.close()}>
                                <Ionicons name="close-outline" size={24} color={colors.foreground} />
                            </Button>
                        </View>
                        <Text className="text-muted-foreground">Seleccione el tipo de almacén</Text>
                    </View>
                    <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
                        <View>
                            <View className="mb-0">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Tipos disponibles</Text>
                            </View>
                            <RadioGroup
                                value={String(newProduct.warehouseTypeId || '')}
                                onValueChange={(val) => {
                                    handleInputChange('warehouseTypeId', val)
                                    warehouseTypeModalRef.current?.close()
                                }}
                            >
                                {Array.isArray(warehouseTypes) && warehouseTypes.length > 0 ? (
                                    warehouseTypes.map((wt) => (
                                        <RadioGroup.Item
                                            key={wt.id}
                                            value={String(wt.id)}
                                            className="-my-0.5 flex-row items-center p-4 bg-accent-soft rounded-lg border-0"
                                        >
                                            <View className="flex-1">
                                                <RadioGroup.Title className="text-foreground font-medium text-lg">
                                                    {wt.code} - {wt.name}
                                                </RadioGroup.Title>
                                                {wt.description && <Text className="text-muted-foreground text-sm">{wt.description}</Text>}
                                            </View>
                                            <RadioGroup.Indicator />
                                        </RadioGroup.Item>
                                    ))
                                ) : (
                                    <View className="p-4 items-center">
                                        <Text className="text-muted-foreground">No hay tipos disponibles</Text>
                                    </View>
                                )}
                            </RadioGroup>
                        </View>
                    </ScrollView>
                </View>
            </Modalize>
        </>
    )
}

// =====================================================================
// MODAL DE EDICIÓN DE PRODUCTO (ESQUELETO)
// =====================================================================
const EditProductModalContent = ({ modalRef, product, onProductUpdated, alertRef, catalogues, statuses, unitsOfMeasurement, warehouseTypes }) => {
    const { colors } = useTheme()
    const catalogueModalRef = useRef(null)
    const statusModalRef = useRef(null)
    const unidadMedidaModalRef = useRef(null)
    const warehouseTypeModalRef = useRef(null)
    const [isSaving, setIsSaving] = useState(false)
    const [showDatePickerIngreso, setShowDatePickerIngreso] = useState(false)
    const [showDatePickerCaducidad, setShowDatePickerCaducidad] = useState(false)
    const [showDatePickerMuestreo, setShowDatePickerMuestreo] = useState(false)
    const [showDatePickerReanalisis, setShowDatePickerReanalisis] = useState(false)

    // Inicializar fechas con fecha actual
    const getTodayDateString = () => {
        const today = new Date()
        return formatDateToLocalString(today)
    }

    const [editedProduct, setEditedProduct] = useState({
        id: null,
        stockCatalogueId: '',
        productStatusId: '',
        unitOfMeasurementId: '',
        warehouseTypeId: '',
        nombre: '',
        codigoProducto: '',
        lote: '',
        loteProveedor: '',
        fabricante: '',
        distribuidor: '',
        fechaIngreso: '',
        fechaCaducidad: '',
        fechaMuestreo: '',
        fechaReanalisis: '',
        cantidad: '',
        numeroAnalisis: '',
        numeroContenedores: '',
    })
    const [productErrors, setProductErrors] = useState({
        stockCatalogueId: [],
        productStatusId: [],
        unitOfMeasurementId: [],
        warehouseTypeId: [],
        nombre: [],
        codigoProducto: [],
        lote: [],
        loteProveedor: [],
        fabricante: [],
        distribuidor: [],
        fechaIngreso: [],
        fechaCaducidad: [],
        fechaMuestreo: [],
        fechaReanalisis: [],
        cantidad: [],
        numeroAnalisis: [],
        numeroContenedores: [],
    })

    const validators = {
        stockCatalogueId: [required],
        productStatusId: [required],
        unitOfMeasurementId: [required],
        warehouseTypeId: [required],
        nombre: [required],
        codigoProducto: [required],
        lote: [required],
        loteProveedor: [required],
        fabricante: [],
        distribuidor: [],
        fechaIngreso: [required, validDate],
        fechaCaducidad: [],
        fechaMuestreo: [],
        fechaReanalisis: [],
        cantidad: [required, validPositiveNumber],
        numeroAnalisis: [],
        numeroContenedores: [required, validPositiveNumber],
    }

    const runValidators = (value, fns) => fns.map((fn) => fn(value)).filter(Boolean)

    const handleInputChange = (field, value) => {
        setEditedProduct((prev) => ({ ...prev, [field]: value }))
        const fns = validators[field] || []
        const errs = runValidators(value, fns)
        setProductErrors((prev) => ({ ...prev, [field]: errs }))
    }

    const onDateChange = (field, event, selectedDate) => {
        if (Platform.OS === 'android') {
            if (field === 'ingreso') setShowDatePickerIngreso(false)
            if (field === 'caducidad') setShowDatePickerCaducidad(false)
            if (field === 'muestreo') setShowDatePickerMuestreo(false)
            if (field === 'reanalisis') setShowDatePickerReanalisis(false)
        }

        if (event.type === 'set' && selectedDate) {
            // Usar formato local para evitar problemas de zona horaria
            const formattedDate = formatDateToLocalString(selectedDate)
            if (field === 'ingreso') {
                handleInputChange('fechaIngreso', formattedDate)
            } else if (field === 'caducidad') {
                handleInputChange('fechaCaducidad', formattedDate)
            } else if (field === 'muestreo') {
                handleInputChange('fechaMuestreo', formattedDate)
            } else if (field === 'reanalisis') {
                handleInputChange('fechaReanalisis', formattedDate)
            }
        } else {
            if (field === 'ingreso') setShowDatePickerIngreso(false)
            if (field === 'caducidad') setShowDatePickerCaducidad(false)
            if (field === 'muestreo') setShowDatePickerMuestreo(false)
            if (field === 'reanalisis') setShowDatePickerReanalisis(false)
        }
    }

    useEffect(() => {
        if (product) {
            setEditedProduct({
                id: product.id,
                stockCatalogueId: product.stockCatalogueId || '',
                productStatusId: product.productStatusId || '',
                unitOfMeasurementId: product.unitOfMeasurementId || '',
                warehouseTypeId: product.warehouseTypeId || '',
                nombre: product.nombre || '',
                codigoProducto: product.codigoProducto || product.codigo || '',
                lote: product.lote || '',
                loteProveedor: product.loteProveedor || '',
                fabricante: product.fabricante || '',
                distribuidor: product.distribuidor || '',
                fechaIngreso: product.fecha ? product.fecha.split('T')[0] : getTodayDateString(),
                fechaCaducidad: product.caducidad ? product.caducidad.split('T')[0] : getTodayDateString(),
                fechaMuestreo: product.muestreo ? product.muestreo.split('T')[0] : getTodayDateString(),
                fechaReanalisis: product.reanalisis ? product.reanalisis.split('T')[0] : getTodayDateString(),
                cantidad: product.cantidadTotal ? String(product.cantidadTotal) : '',
                numeroAnalisis: product.numeroAnalisis || '',
                numeroContenedores: product.numeroContenedores ? String(product.numeroContenedores) : '',
            })
            setProductErrors({
                stockCatalogueId: [],
                productStatusId: [],
                unitOfMeasurementId: [],
                warehouseTypeId: [],
                nombre: [],
                codigoProducto: [],
                lote: [],
                loteProveedor: [],
                fabricante: [],
                distribuidor: [],
                fechaIngreso: [],
                fechaCaducidad: [],
                fechaMuestreo: [],
                fechaReanalisis: [],
                cantidad: [],
                numeroAnalisis: [],
                numeroContenedores: [],
            })
        }
    }, [product])

    const onClose = () => {
        modalRef.current?.close()
        setShowDatePickerIngreso(false)
        setShowDatePickerCaducidad(false)
        setShowDatePickerMuestreo(false)
        setShowDatePickerReanalisis(false)
    }

    const getCatalogueName = (id) => {
        const cat = catalogues.find((c) => c.id === Number(id))
        return cat ? cat.name : 'Seleccionar catálogo'
    }

    const getStatusName = (id) => {
        const status = statuses.find((s) => s.id === Number(id))
        return status ? status.name : 'Seleccionar estado'
    }

    const getUnitOfMeasurementName = (id) => {
        if (!id) return 'Seleccionar unidad'
        const unit = unitsOfMeasurement.find((u) => u.id === Number(id))
        return unit ? `${unit.name} (${unit.code})` : 'Seleccionar unidad'
    }

    const getWarehouseTypeName = (id) => {
        if (!id) return 'Seleccionar tipo'
        const wt = warehouseTypes.find((w) => w.id === Number(id))
        return wt ? `${wt.code} - ${wt.name}` : 'Seleccionar tipo'
    }

    const handleSave = async () => {
        // Validación final
        const stockCatalogueIdErrs = runValidators(editedProduct.stockCatalogueId, validators.stockCatalogueId)
        const productStatusIdErrs = runValidators(editedProduct.productStatusId, validators.productStatusId)
        const unitOfMeasurementIdErrs = runValidators(editedProduct.unitOfMeasurementId, validators.unitOfMeasurementId)
        const warehouseTypeIdErrs = runValidators(editedProduct.warehouseTypeId, validators.warehouseTypeId)
        const nombreErrs = runValidators(editedProduct.nombre, validators.nombre)
        const codigoProductoErrs = runValidators(editedProduct.codigoProducto, validators.codigoProducto)
        const loteErrs = runValidators(editedProduct.lote, validators.lote)
        const loteProveedorErrs = runValidators(editedProduct.loteProveedor, validators.loteProveedor)
        const fechaIngresoErrs = runValidators(editedProduct.fechaIngreso, validators.fechaIngreso)
        const cantidadErrs = runValidators(editedProduct.cantidad, validators.cantidad)
        const numeroContenedoresErrs = runValidators(editedProduct.numeroContenedores, validators.numeroContenedores)

        if (
            stockCatalogueIdErrs.length > 0 ||
            productStatusIdErrs.length > 0 ||
            unitOfMeasurementIdErrs.length > 0 ||
            warehouseTypeIdErrs.length > 0 ||
            nombreErrs.length > 0 ||
            codigoProductoErrs.length > 0 ||
            loteErrs.length > 0 ||
            loteProveedorErrs.length > 0 ||
            fechaIngresoErrs.length > 0 ||
            cantidadErrs.length > 0 ||
            numeroContenedoresErrs.length > 0
        ) {
            setProductErrors({
                stockCatalogueId: stockCatalogueIdErrs,
                productStatusId: productStatusIdErrs,
                unitOfMeasurementId: unitOfMeasurementIdErrs,
                warehouseTypeId: warehouseTypeIdErrs,
                nombre: nombreErrs,
                codigoProducto: codigoProductoErrs,
                lote: loteErrs,
                loteProveedor: loteProveedorErrs,
                fabricante: [],
                distribuidor: [],
                fechaIngreso: fechaIngresoErrs,
                fechaCaducidad: [],
                fechaMuestreo: [],
                fechaReanalisis: [],
                cantidad: cantidadErrs,
                numeroAnalisis: [],
                numeroContenedores: numeroContenedoresErrs,
            })
            alertRef.current?.show('Atención', 'Por favor corrija los errores en el formulario.', 'warning')
            return
        }

        try {
            setIsSaving(true)
            const cantidadValue = Number(editedProduct.cantidad)
            const productData = {
                id: editedProduct.id,
                stockCatalogueId: Number(editedProduct.stockCatalogueId),
                productStatusId: Number(editedProduct.productStatusId),
                unitOfMeasurementId: editedProduct.unitOfMeasurementId ? Number(editedProduct.unitOfMeasurementId) : null,
                warehouseTypeId: editedProduct.warehouseTypeId ? Number(editedProduct.warehouseTypeId) : null,
                nombre: editedProduct.nombre.trim(),
                codigoProducto: editedProduct.codigoProducto.trim() || null,
                lote: editedProduct.lote.trim(),
                loteProveedor: editedProduct.loteProveedor.trim() || null,
                fabricante: editedProduct.fabricante.trim() || null,
                distribuidor: editedProduct.distribuidor.trim() || null,
                fechaIngreso: editedProduct.fechaIngreso.trim() || null,
                fechaCaducidad: editedProduct.fechaCaducidad.trim() || null,
                fechaMuestreo: editedProduct.fechaMuestreo.trim() || null,
                reanalisis: editedProduct.fechaReanalisis.trim() || null,
                cantidadTotal: cantidadValue,
                numeroAnalisis: editedProduct.numeroAnalisis.trim() || null,
                numeroContenedores: Number(editedProduct.numeroContenedores),
            }
            const response = await updateProduct(productData)
            if (response.type === 'SUCCESS') {
                onClose()
                setTimeout(() => {
                    alertRef.current?.show('Éxito', 'Producto actualizado correctamente', 'success')
                }, 300)
                if (onProductUpdated) onProductUpdated()
            } else {
                alertRef.current?.show('Error', 'No se pudo actualizar el producto', 'error')
            }
        } catch (error) {
            console.error('Error update product:', error)
            if (error.response?.data) {
                const { result, title } = error.response.data
                alertRef.current?.show('Error', title || 'Error al actualizar producto', 'error')
                if (result && Array.isArray(result) && result.length > 0) {
                    const newFieldErrors = {
                        stockCatalogueId: [],
                        productStatusId: [],
                        unitOfMeasurementId: [],
                        warehouseTypeId: [],
                        nombre: [],
                        codigoProducto: [],
                        lote: [],
                        loteProveedor: [],
                        fabricante: [],
                        distribuidor: [],
                        fechaIngreso: [],
                        fechaCaducidad: [],
                        fechaMuestreo: [],
                        fechaReanalisis: [],
                        cantidad: [],
                        numeroAnalisis: [],
                        numeroContenedores: [],
                    }
                    result.forEach((validationError) => {
                        const field = validationError.field
                        const descriptions = validationError.descriptions || []
                        if (newFieldErrors.hasOwnProperty(field)) {
                            newFieldErrors[field] = descriptions
                        }
                    })
                    setProductErrors(newFieldErrors)
                }
            } else {
                alertRef.current?.show('Error', 'Error al actualizar producto', 'error')
            }
        } finally {
            setIsSaving(false)
        }
    }

    const hasErrors = () => {
        return (
            productErrors.stockCatalogueId.length > 0 ||
            productErrors.productStatusId.length > 0 ||
            productErrors.unitOfMeasurementId.length > 0 ||
            productErrors.warehouseTypeId.length > 0 ||
            productErrors.nombre.length > 0 ||
            productErrors.codigoProducto.length > 0 ||
            productErrors.lote.length > 0 ||
            productErrors.loteProveedor.length > 0 ||
            productErrors.fechaIngreso.length > 0 ||
            productErrors.cantidad.length > 0 ||
            productErrors.numeroContenedores.length > 0 ||
            !editedProduct.stockCatalogueId ||
            !editedProduct.productStatusId ||
            !editedProduct.unitOfMeasurementId ||
            !editedProduct.warehouseTypeId ||
            !editedProduct.nombre.trim() ||
            !editedProduct.codigoProducto.trim() ||
            !editedProduct.lote.trim() ||
            !editedProduct.loteProveedor.trim() ||
            !editedProduct.fechaIngreso ||
            !editedProduct.cantidad ||
            !editedProduct.numeroContenedores
        )
    }

    return (
        <>
            <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
                <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingHorizontal: '6%', paddingTop: '9%', paddingBottom: '6%' }}
                    >
                        {product ? (
                            <>
                                <View className="flex gap-0 mb-8">
                                    <View className="flex flex-row justify-between items-center">
                                        <Text className="text-foreground text-2xl font-medium">Editar producto</Text>
                                        <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                            <Ionicons name="close-outline" size={24} color={colors.foreground} />
                                        </Button>
                                    </View>
                                    <Text className="text-muted-foreground">Edite los datos del producto</Text>
                                </View>

                                <View className="gap-6">
                                    {/* CATÁLOGO */}
                                    <View>
                                        <Text className="text-foreground font-medium mb-2">
                                            Catálogo <Text className="text-danger">*</Text>
                                        </Text>
                                        <TouchableOpacity onPress={() => catalogueModalRef.current?.open()}>
                                            <View className="w-full h-12 flex-row items-center justify-between px-4 rounded-lg bg-accent-soft">
                                                <Text className="text-foreground font-medium">{getCatalogueName(editedProduct.stockCatalogueId)}</Text>
                                                <Ionicons name="chevron-down-outline" size={24} color={colors.accent} />
                                            </View>
                                        </TouchableOpacity>
                                        {productErrors.stockCatalogueId.length > 0 ? (
                                            <Text className="text-danger text-sm mt-1">{productErrors.stockCatalogueId.join('\n')}</Text>
                                        ) : null}
                                    </View>

                                    {/* ESTADO */}
                                    <View>
                                        <Text className="text-foreground font-medium mb-2">
                                            Estado <Text className="text-danger">*</Text>
                                        </Text>
                                        <TouchableOpacity onPress={() => statusModalRef.current?.open()}>
                                            <View className="w-full h-12 flex-row items-center justify-between px-4 rounded-lg bg-accent-soft">
                                                <Text className="text-foreground font-medium">{getStatusName(editedProduct.productStatusId)}</Text>
                                                <Ionicons name="chevron-down-outline" size={24} color={colors.accent} />
                                            </View>
                                        </TouchableOpacity>
                                        {productErrors.productStatusId.length > 0 ? (
                                            <Text className="text-danger text-sm mt-1">{productErrors.productStatusId.join('\n')}</Text>
                                        ) : null}
                                    </View>

                                    {/* NOMBRE */}
                                    <TextField isRequired isInvalid={productErrors.nombre.length > 0}>
                                        <View className="flex-row justify-between items-center mb-2">
                                            <TextField.Label className="text-foreground font-medium">Nombre</TextField.Label>
                                            <Text className="text-muted-foreground text-xs">{editedProduct.nombre.length} / 200</Text>
                                        </View>
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: productErrors.nombre.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: productErrors.nombre.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="Nombre del producto"
                                            value={editedProduct.nombre}
                                            onChangeText={(text) => handleInputChange('nombre', text)}
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                            maxLength={200}
                                        >
                                            <TextField.InputEndContent>
                                                {productErrors.nombre.length === 0 && editedProduct.nombre.trim() ? (
                                                    <Ionicons name="checkmark" size={24} color={colors.accent} />
                                                ) : productErrors.nombre.length > 0 ? (
                                                    <Ionicons name="close" size={24} color={colors.danger} />
                                                ) : null}
                                            </TextField.InputEndContent>
                                        </TextField.Input>
                                        {productErrors.nombre.length > 0 ? (
                                            <TextField.ErrorMessage>{productErrors.nombre.join('\n')}</TextField.ErrorMessage>
                                        ) : undefined}
                                    </TextField>

                                    {/* LOTE */}
                                    <TextField isRequired isInvalid={productErrors.lote.length > 0}>
                                        <View className="flex-row justify-between items-center mb-2">
                                            <TextField.Label className="text-foreground font-medium">Lote</TextField.Label>
                                            <Text className="text-muted-foreground text-xs">{editedProduct.lote.length} / 100</Text>
                                        </View>
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: productErrors.lote.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: productErrors.lote.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="Número de lote"
                                            value={editedProduct.lote}
                                            onChangeText={(text) => handleInputChange('lote', text)}
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                            maxLength={100}
                                        >
                                            <TextField.InputEndContent>
                                                {productErrors.lote.length === 0 && editedProduct.lote.trim() ? (
                                                    <Ionicons name="checkmark" size={24} color={colors.accent} />
                                                ) : productErrors.lote.length > 0 ? (
                                                    <Ionicons name="close" size={24} color={colors.danger} />
                                                ) : null}
                                            </TextField.InputEndContent>
                                        </TextField.Input>
                                        {productErrors.lote.length > 0 ? (
                                            <TextField.ErrorMessage>{productErrors.lote.join('\n')}</TextField.ErrorMessage>
                                        ) : undefined}
                                    </TextField>

                                    {/* CÓDIGO PRODUCTO */}
                                    <TextField isRequired isInvalid={productErrors.codigoProducto.length > 0}>
                                        <View className="flex-row justify-between items-center mb-2">
                                            <TextField.Label className="text-foreground font-medium">Código del producto</TextField.Label>
                                            <Text className="text-muted-foreground text-xs">{editedProduct.codigoProducto.length} / 50</Text>
                                        </View>
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: productErrors.codigoProducto.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: productErrors.codigoProducto.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="Código del producto"
                                            value={editedProduct.codigoProducto}
                                            onChangeText={(text) => handleInputChange('codigoProducto', text)}
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                            maxLength={50}
                                        >
                                            <TextField.InputEndContent>
                                                {productErrors.codigoProducto.length === 0 && editedProduct.codigoProducto.trim() ? (
                                                    <Ionicons name="checkmark" size={24} color={colors.accent} />
                                                ) : productErrors.codigoProducto.length > 0 ? (
                                                    <Ionicons name="close" size={24} color={colors.danger} />
                                                ) : null}
                                            </TextField.InputEndContent>
                                        </TextField.Input>
                                        {productErrors.codigoProducto.length > 0 ? (
                                            <TextField.ErrorMessage>{productErrors.codigoProducto.join('\n')}</TextField.ErrorMessage>
                                        ) : undefined}
                                    </TextField>

                                    {/* LOTE PROVEEDOR */}
                                    <TextField isRequired isInvalid={productErrors.loteProveedor.length > 0}>
                                        <View className="flex-row justify-between items-center mb-2">
                                            <TextField.Label className="text-foreground font-medium">Lote de proveedor</TextField.Label>
                                            <Text className="text-muted-foreground text-xs">{editedProduct.loteProveedor.length} / 100</Text>
                                        </View>
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: productErrors.loteProveedor.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: productErrors.loteProveedor.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="Lote del proveedor"
                                            value={editedProduct.loteProveedor}
                                            onChangeText={(text) => handleInputChange('loteProveedor', text)}
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                            maxLength={100}
                                        />
                                        {productErrors.loteProveedor.length > 0 ? (
                                            <TextField.ErrorMessage>{productErrors.loteProveedor.join('\n')}</TextField.ErrorMessage>
                                        ) : undefined}
                                    </TextField>

                                    {/* FABRICANTE */}
                                    <TextField isInvalid={productErrors.fabricante.length > 0}>
                                        <View className="flex-row justify-between items-center mb-2">
                                            <TextField.Label className="text-foreground font-medium">Fabricante (Opcional)</TextField.Label>
                                            <Text className="text-muted-foreground text-xs">{editedProduct.fabricante.length} / 200</Text>
                                        </View>
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: productErrors.fabricante.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: productErrors.fabricante.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="Nombre del fabricante"
                                            value={editedProduct.fabricante}
                                            onChangeText={(text) => handleInputChange('fabricante', text)}
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                            maxLength={200}
                                        />
                                        {productErrors.fabricante.length > 0 ? (
                                            <TextField.ErrorMessage>{productErrors.fabricante.join('\n')}</TextField.ErrorMessage>
                                        ) : undefined}
                                    </TextField>

                                    {/* DISTRIBUIDOR */}
                                    <TextField isInvalid={productErrors.distribuidor.length > 0}>
                                        <View className="flex-row justify-between items-center mb-2">
                                            <TextField.Label className="text-foreground font-medium">Distribuidor (Opcional)</TextField.Label>
                                            <Text className="text-muted-foreground text-xs">{editedProduct.distribuidor.length} / 200</Text>
                                        </View>
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: productErrors.distribuidor.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: productErrors.distribuidor.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="Nombre del distribuidor"
                                            value={editedProduct.distribuidor}
                                            onChangeText={(text) => handleInputChange('distribuidor', text)}
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                            maxLength={200}
                                        />
                                        {productErrors.distribuidor.length > 0 ? (
                                            <TextField.ErrorMessage>{productErrors.distribuidor.join('\n')}</TextField.ErrorMessage>
                                        ) : undefined}
                                    </TextField>

                                    {/* FECHA INGRESO */}
                                    <TextField isRequired isInvalid={productErrors.fechaIngreso.length > 0}>
                                        <TextField.Label className="text-foreground font-medium mb-2">Fecha de ingreso</TextField.Label>
                                        <Pressable onPress={() => setShowDatePickerIngreso(true)}>
                                            <View pointerEvents="none">
                                                <TextField.Input
                                                    colors={{
                                                        blurBackground: colors.accentSoft,
                                                        focusBackground: colors.surface2,
                                                        blurBorder: productErrors.fechaIngreso.length > 0 ? colors.danger : colors.accentSoft,
                                                        focusBorder: productErrors.fechaIngreso.length > 0 ? colors.danger : colors.surface2,
                                                    }}
                                                    placeholder="12/DIC/2025"
                                                    value={editedProduct.fechaIngreso ? formatDateStringToShort(editedProduct.fechaIngreso) : ''}
                                                    editable={false}
                                                    cursorColor={colors.accent}
                                                    selectionHandleColor={colors.accent}
                                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                                >
                                                    <TextField.InputEndContent>
                                                        <Ionicons name="calendar-outline" size={24} color={colors.accent} />
                                                    </TextField.InputEndContent>
                                                </TextField.Input>
                                            </View>
                                        </Pressable>
                                        {productErrors.fechaIngreso.length > 0 ? (
                                            <TextField.ErrorMessage>{productErrors.fechaIngreso.join('\n')}</TextField.ErrorMessage>
                                        ) : undefined}
                                        {showDatePickerIngreso && (
                                            <DateTimePicker
                                                testID="dateTimePickerIngreso"
                                                value={editedProduct.fechaIngreso ? new Date(editedProduct.fechaIngreso) : new Date()}
                                                mode="date"
                                                is24Hour={true}
                                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                                onChange={(event, selectedDate) => onDateChange('ingreso', event, selectedDate)}
                                            />
                                        )}
                                    </TextField>

                                    {/* FECHA CADUCIDAD */}
                                    <TextField isInvalid={productErrors.fechaCaducidad.length > 0}>
                                        <TextField.Label className="text-foreground font-medium mb-2">Fecha de caducidad</TextField.Label>
                                        <Pressable onPress={() => setShowDatePickerCaducidad(true)}>
                                            <View pointerEvents="none">
                                                <TextField.Input
                                                    colors={{
                                                        blurBackground: colors.accentSoft,
                                                        focusBackground: colors.surface2,
                                                        blurBorder: productErrors.fechaCaducidad.length > 0 ? colors.danger : colors.accentSoft,
                                                        focusBorder: productErrors.fechaCaducidad.length > 0 ? colors.danger : colors.surface2,
                                                    }}
                                                    placeholder="12/DIC/2025"
                                                    value={editedProduct.fechaCaducidad ? formatDateStringToShort(editedProduct.fechaCaducidad) : ''}
                                                    editable={false}
                                                    cursorColor={colors.accent}
                                                    selectionHandleColor={colors.accent}
                                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                                >
                                                    <TextField.InputEndContent>
                                                        <Ionicons name="calendar-outline" size={24} color={colors.accent} />
                                                    </TextField.InputEndContent>
                                                </TextField.Input>
                                            </View>
                                        </Pressable>
                                        {productErrors.fechaCaducidad.length > 0 ? (
                                            <TextField.ErrorMessage>{productErrors.fechaCaducidad.join('\n')}</TextField.ErrorMessage>
                                        ) : undefined}
                                        {showDatePickerCaducidad && (
                                            <DateTimePicker
                                                testID="dateTimePickerCaducidad"
                                                value={editedProduct.fechaCaducidad ? new Date(editedProduct.fechaCaducidad) : new Date()}
                                                mode="date"
                                                is24Hour={true}
                                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                                onChange={(event, selectedDate) => onDateChange('caducidad', event, selectedDate)}
                                            />
                                        )}
                                    </TextField>

                                    {/* FECHA REANÁLISIS */}
                                    <TextField isInvalid={productErrors.fechaReanalisis.length > 0}>
                                        <TextField.Label className="text-foreground font-medium mb-2">Fecha de reanálisis</TextField.Label>
                                        <Pressable onPress={() => setShowDatePickerReanalisis(true)}>
                                            <View pointerEvents="none">
                                                <TextField.Input
                                                    colors={{
                                                        blurBackground: colors.accentSoft,
                                                        focusBackground: colors.surface2,
                                                        blurBorder: productErrors.fechaReanalisis.length > 0 ? colors.danger : colors.accentSoft,
                                                        focusBorder: productErrors.fechaReanalisis.length > 0 ? colors.danger : colors.surface2,
                                                    }}
                                                    placeholder="12/DIC/2025"
                                                    value={editedProduct.fechaReanalisis ? formatDateStringToShort(editedProduct.fechaReanalisis) : ''}
                                                    editable={false}
                                                    cursorColor={colors.accent}
                                                    selectionHandleColor={colors.accent}
                                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                                >
                                                    <TextField.InputEndContent>
                                                        <Ionicons name="calendar-outline" size={24} color={colors.accent} />
                                                    </TextField.InputEndContent>
                                                </TextField.Input>
                                            </View>
                                        </Pressable>
                                        {productErrors.fechaReanalisis.length > 0 ? (
                                            <TextField.ErrorMessage>{productErrors.fechaReanalisis.join('\n')}</TextField.ErrorMessage>
                                        ) : undefined}
                                        {showDatePickerReanalisis && (
                                            <DateTimePicker
                                                testID="dateTimePickerReanalisis"
                                                value={editedProduct.fechaReanalisis ? new Date(editedProduct.fechaReanalisis) : new Date()}
                                                mode="date"
                                                is24Hour={true}
                                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                                onChange={(event, selectedDate) => onDateChange('reanalisis', event, selectedDate)}
                                            />
                                        )}
                                    </TextField>
                                    <TextField isInvalid={productErrors.fechaMuestreo.length > 0}>
                                        <TextField.Label className="text-foreground font-medium mb-2">Fecha de muestreo</TextField.Label>
                                        <Pressable onPress={() => setShowDatePickerMuestreo(true)}>
                                            <View pointerEvents="none">
                                                <TextField.Input
                                                    colors={{
                                                        blurBackground: colors.accentSoft,
                                                        focusBackground: colors.surface2,
                                                        blurBorder: productErrors.fechaMuestreo.length > 0 ? colors.danger : colors.accentSoft,
                                                        focusBorder: productErrors.fechaMuestreo.length > 0 ? colors.danger : colors.surface2,
                                                    }}
                                                    placeholder="12/DIC/2025"
                                                    value={editedProduct.fechaMuestreo ? formatDateStringToShort(editedProduct.fechaMuestreo) : ''}
                                                    editable={false}
                                                    cursorColor={colors.accent}
                                                    selectionHandleColor={colors.accent}
                                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                                >
                                                    <TextField.InputEndContent>
                                                        <Ionicons name="calendar-outline" size={24} color={colors.accent} />
                                                    </TextField.InputEndContent>
                                                </TextField.Input>
                                            </View>
                                        </Pressable>
                                        {productErrors.fechaMuestreo.length > 0 ? (
                                            <TextField.ErrorMessage>{productErrors.fechaMuestreo.join('\n')}</TextField.ErrorMessage>
                                        ) : undefined}
                                        {showDatePickerMuestreo && (
                                            <DateTimePicker
                                                testID="dateTimePickerMuestreo"
                                                value={editedProduct.fechaMuestreo ? new Date(editedProduct.fechaMuestreo) : new Date()}
                                                mode="date"
                                                is24Hour={true}
                                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                                onChange={(event, selectedDate) => onDateChange('muestreo', event, selectedDate)}
                                            />
                                        )}
                                    </TextField>

                                    {/* UNIDAD DE MEDIDA */}
                                    <View>
                                        <Text className="text-foreground font-medium mb-2">
                                            Unidad de medida <Text className="text-danger">*</Text>
                                        </Text>
                                        <TouchableOpacity onPress={() => unidadMedidaModalRef.current?.open()}>
                                            <View className="w-full h-12 flex-row items-center justify-between px-4 rounded-lg bg-accent-soft">
                                                <Text className="text-foreground font-medium">
                                                    {getUnitOfMeasurementName(editedProduct.unitOfMeasurementId)}
                                                </Text>
                                                <Ionicons name="chevron-down-outline" size={24} color={colors.accent} />
                                            </View>
                                        </TouchableOpacity>
                                        {productErrors.unitOfMeasurementId.length > 0 ? (
                                            <Text className="text-danger text-sm mt-1">{productErrors.unitOfMeasurementId.join('\n')}</Text>
                                        ) : null}
                                    </View>

                                    {/* TIPO DE ALMACÉN */}
                                    <View>
                                        <Text className="text-foreground font-medium mb-2">
                                            Tipo de almacén <Text className="text-danger">*</Text>
                                        </Text>
                                        <TouchableOpacity onPress={() => warehouseTypeModalRef.current?.open()}>
                                            <View className="w-full h-12 flex-row items-center justify-between px-4 rounded-lg bg-accent-soft">
                                                <Text className="text-foreground font-medium">{getWarehouseTypeName(editedProduct.warehouseTypeId)}</Text>
                                                <Ionicons name="chevron-down-outline" size={24} color={colors.accent} />
                                            </View>
                                        </TouchableOpacity>
                                        {productErrors.warehouseTypeId.length > 0 ? (
                                            <Text className="text-danger text-sm mt-1">{productErrors.warehouseTypeId.join('\n')}</Text>
                                        ) : null}
                                    </View>

                                    {/* CANTIDAD TOTAL */}
                                    <TextField isRequired isInvalid={productErrors.cantidad.length > 0}>
                                        <TextField.Label className="text-foreground font-medium mb-2">Cantidad total</TextField.Label>
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: productErrors.cantidad.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: productErrors.cantidad.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="Ej: 500"
                                            value={editedProduct.cantidad}
                                            onChangeText={(text) => handleInputChange('cantidad', text)}
                                            keyboardType="numeric"
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                        >
                                            <TextField.InputEndContent>
                                                {productErrors.cantidad.length === 0 && editedProduct.cantidad ? (
                                                    <Ionicons name="checkmark" size={24} color={colors.accent} />
                                                ) : productErrors.cantidad.length > 0 ? (
                                                    <Ionicons name="close" size={24} color={colors.danger} />
                                                ) : null}
                                            </TextField.InputEndContent>
                                        </TextField.Input>
                                        {productErrors.cantidad.length > 0 ? (
                                            <TextField.ErrorMessage>{productErrors.cantidad.join('\n')}</TextField.ErrorMessage>
                                        ) : undefined}
                                    </TextField>

                                    {/* NÚMERO DE CONTENEDORES */}
                                    <TextField isRequired isInvalid={productErrors.numeroContenedores.length > 0}>
                                        <TextField.Label className="text-foreground font-medium mb-2">Número de contenedores</TextField.Label>
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: productErrors.numeroContenedores.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: productErrors.numeroContenedores.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="Ej: 10"
                                            value={editedProduct.numeroContenedores}
                                            onChangeText={(text) => handleInputChange('numeroContenedores', text)}
                                            keyboardType="numeric"
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                        >
                                            <TextField.InputEndContent>
                                                {productErrors.numeroContenedores.length === 0 && editedProduct.numeroContenedores ? (
                                                    <Ionicons name="checkmark" size={24} color={colors.accent} />
                                                ) : productErrors.numeroContenedores.length > 0 ? (
                                                    <Ionicons name="close" size={24} color={colors.danger} />
                                                ) : null}
                                            </TextField.InputEndContent>
                                        </TextField.Input>
                                        {productErrors.numeroContenedores.length > 0 ? (
                                            <TextField.ErrorMessage>{productErrors.numeroContenedores.join('\n')}</TextField.ErrorMessage>
                                        ) : undefined}
                                    </TextField>

                                    {/* NÚMERO DE ANÁLISIS */}
                                    <TextField isInvalid={productErrors.numeroAnalisis.length > 0}>
                                        <View className="flex-row justify-between items-center mb-2">
                                            <TextField.Label className="text-foreground font-medium">Número de análisis (Opcional)</TextField.Label>
                                            <Text className="text-muted-foreground text-xs">{editedProduct.numeroAnalisis.length} / 50</Text>
                                        </View>
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: productErrors.numeroAnalisis.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: productErrors.numeroAnalisis.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="Número de análisis"
                                            value={editedProduct.numeroAnalisis}
                                            onChangeText={(text) => handleInputChange('numeroAnalisis', text)}
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                            maxLength={50}
                                        />
                                        {productErrors.numeroAnalisis.length > 0 ? (
                                            <TextField.ErrorMessage>{productErrors.numeroAnalisis.join('\n')}</TextField.ErrorMessage>
                                        ) : undefined}
                                    </TextField>
                                </View>

                                <View className="flex-row justify-end gap-3 pt-8">
                                    <Button className="flex-1" variant="primary" onPress={handleSave} isDisabled={isSaving || hasErrors()}>
                                        {isSaving ? (
                                            <>
                                                <Spinner color={colors.accentForeground} size="md" />
                                                <Button.Label>Guardando...</Button.Label>
                                            </>
                                        ) : (
                                            <>
                                                <Ionicons name="download-outline" size={24} color={colors.accentForeground} />
                                                <Button.Label>Guardar</Button.Label>
                                            </>
                                        )}
                                    </Button>
                                </View>
                            </>
                        ) : (
                            <View className="h-20" />
                        )}
                    </ScrollView>
                </View>
            </Modalize>

            {/* Modal de selección de catálogo */}
            {/* Modal de selección de catálogo */}
            <Modalize ref={catalogueModalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
                <View className="px-[6%] pt-[9%] pb-[6%]" style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <View className="flex gap-0 mb-8">
                        <View className="flex flex-row justify-between items-center">
                            <Text className="text-foreground text-2xl font-medium">Seleccionar catálogo</Text>
                            <Button isIconOnly className="bg-transparent shrink-0" onPress={() => catalogueModalRef.current?.close()}>
                                <Ionicons name="close-outline" size={24} color={colors.foreground} />
                            </Button>
                        </View>
                        <Text className="text-muted-foreground">Seleccione el catálogo del producto</Text>
                    </View>
                    <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
                        <View className="pb-6">
                            <View className="mb-0">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Catálogos disponibles</Text>
                            </View>
                            <RadioGroup value={String(editedProduct.stockCatalogueId)} onValueChange={(val) => handleInputChange('stockCatalogueId', val)}>
                                {Array.isArray(catalogues) && catalogues.length > 0 ? (
                                    catalogues.map((cat) => (
                                        <RadioGroup.Item
                                            key={cat.id}
                                            value={String(cat.id)}
                                            className="-my-0.5 flex-row items-center p-4 bg-accent-soft rounded-lg border-0"
                                        >
                                            <View className="flex-1">
                                                <RadioGroup.Title className="text-foreground font-medium text-lg">{cat.name}</RadioGroup.Title>
                                            </View>
                                            <RadioGroup.Indicator />
                                        </RadioGroup.Item>
                                    ))
                                ) : (
                                    <View className="p-4 items-center">
                                        <Text className="text-muted-foreground">No hay catálogos disponibles</Text>
                                    </View>
                                )}
                            </RadioGroup>
                        </View>
                    </ScrollView>
                </View>
            </Modalize>

            {/* Modal de selección de estado */}
            <Modalize ref={statusModalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
                <View className="px-[6%] pt-[9%] pb-[6%]" style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <View className="flex gap-0 mb-8">
                        <View className="flex flex-row justify-between items-center">
                            <Text className="text-foreground text-2xl font-medium">Seleccionar estado</Text>
                            <Button isIconOnly className="bg-transparent shrink-0" onPress={() => statusModalRef.current?.close()}>
                                <Ionicons name="close-outline" size={24} color={colors.foreground} />
                            </Button>
                        </View>
                        <Text className="text-muted-foreground">Seleccione el estado del producto</Text>
                    </View>
                    <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
                        <View className="pb-6">
                            <View className="mb-0">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Estados disponibles</Text>
                            </View>
                            <RadioGroup value={String(editedProduct.productStatusId)} onValueChange={(val) => handleInputChange('productStatusId', val)}>
                                {statuses.map((status) => (
                                    <RadioGroup.Item
                                        key={status.id}
                                        value={String(status.id)}
                                        className="-my-0.5 flex-row items-center p-4 bg-accent-soft rounded-lg border-0"
                                    >
                                        <View className="flex-1">
                                            <RadioGroup.Title className="text-foreground font-medium text-lg">{status.name}</RadioGroup.Title>
                                        </View>
                                        <RadioGroup.Indicator />
                                    </RadioGroup.Item>
                                ))}
                            </RadioGroup>
                        </View>
                    </ScrollView>
                </View>
            </Modalize>

            {/* Modal de selección de unidad de medida */}
            <Modalize ref={unidadMedidaModalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
                <View className="px-[6%] pt-[9%] pb-[6%]" style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <View className="flex gap-0 mb-8">
                        <View className="flex flex-row justify-between items-center">
                            <Text className="text-foreground text-2xl font-medium">Seleccionar unidad</Text>
                            <Button isIconOnly className="bg-transparent shrink-0" onPress={() => unidadMedidaModalRef.current?.close()}>
                                <Ionicons name="close-outline" size={24} color={colors.foreground} />
                            </Button>
                        </View>
                        <Text className="text-muted-foreground">Seleccione la unidad de medida</Text>
                    </View>
                    <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
                        <View>
                            <View className="mb-0">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Unidades disponibles</Text>
                            </View>
                            <RadioGroup
                                value={String(editedProduct.unitOfMeasurementId || '')}
                                onValueChange={(val) => {
                                    handleInputChange('unitOfMeasurementId', val)
                                    unidadMedidaModalRef.current?.close()
                                }}
                            >
                                {Array.isArray(unitsOfMeasurement) && unitsOfMeasurement.length > 0 ? (
                                    unitsOfMeasurement.map((unit) => (
                                        <RadioGroup.Item
                                            key={unit.id}
                                            value={String(unit.id)}
                                            className="-my-0.5 flex-row items-center p-4 bg-accent-soft rounded-lg border-0"
                                        >
                                            <View className="flex-1">
                                                <RadioGroup.Title className="text-foreground font-medium text-lg">
                                                    {unit.name} ({unit.code})
                                                </RadioGroup.Title>
                                                {unit.description && <Text className="text-muted-foreground text-sm">{unit.description}</Text>}
                                            </View>
                                            <RadioGroup.Indicator />
                                        </RadioGroup.Item>
                                    ))
                                ) : (
                                    <View className="p-4 items-center">
                                        <Text className="text-muted-foreground">No hay unidades disponibles</Text>
                                    </View>
                                )}
                            </RadioGroup>
                        </View>
                    </ScrollView>
                </View>
            </Modalize>

            {/* Modal de selección de tipo de almacén */}
            <Modalize ref={warehouseTypeModalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
                <View className="px-[6%] pt-[9%] pb-[6%]" style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <View className="flex gap-0 mb-8">
                        <View className="flex flex-row justify-between items-center">
                            <Text className="text-foreground text-2xl font-medium">Seleccionar tipo</Text>
                            <Button isIconOnly className="bg-transparent shrink-0" onPress={() => warehouseTypeModalRef.current?.close()}>
                                <Ionicons name="close-outline" size={24} color={colors.foreground} />
                            </Button>
                        </View>
                        <Text className="text-muted-foreground">Seleccione el tipo de almacén</Text>
                    </View>
                    <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
                        <View>
                            <View className="mb-0">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Tipos disponibles</Text>
                            </View>
                            <RadioGroup
                                value={String(editedProduct.warehouseTypeId || '')}
                                onValueChange={(val) => {
                                    handleInputChange('warehouseTypeId', val)
                                    warehouseTypeModalRef.current?.close()
                                }}
                            >
                                {Array.isArray(warehouseTypes) && warehouseTypes.length > 0 ? (
                                    warehouseTypes.map((wt) => (
                                        <RadioGroup.Item
                                            key={wt.id}
                                            value={String(wt.id)}
                                            className="-my-0.5 flex-row items-center p-4 bg-accent-soft rounded-lg border-0"
                                        >
                                            <View className="flex-1">
                                                <RadioGroup.Title className="text-foreground font-medium text-lg">
                                                    {wt.code} - {wt.name}
                                                </RadioGroup.Title>
                                                {wt.description && <Text className="text-muted-foreground text-sm">{wt.description}</Text>}
                                            </View>
                                            <RadioGroup.Indicator />
                                        </RadioGroup.Item>
                                    ))
                                ) : (
                                    <View className="p-4 items-center">
                                        <Text className="text-muted-foreground">No hay tipos disponibles</Text>
                                    </View>
                                )}
                            </RadioGroup>
                        </View>
                    </ScrollView>
                </View>
            </Modalize>
        </>
    )
}

// =====================================================================
// MODAL DE ESCÁNER QR
// =====================================================================
// =====================================================================
// MODAL DE ESCÁNER QR (ESTILO HOMESCREEN)
// =====================================================================
const QrScannerModalContent = ({ modalRef, onScanSuccess, alertRef }) => {
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
                    onScanSuccess(response.data)
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
                        <Ionicons name="scan-outline" size={64} color={colors.muted} />
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
// MODAL DE DETALLES DEL PRODUCTO (DESDE QR)
// =====================================================================
const ProductDetailsModalContent = ({ modalRef, product, onEdit, alertRef, catalogues, statuses }) => {
    const { colors } = useTheme()
    const { userRole } = useAuth()
    const isAdmin = userRole === 'ADMIN' || userRole === '1'

    const onClose = () => modalRef.current?.close()

    const getCatalogueName = (id) => {
        if (!id) return 'Sin catálogo'
        const cat = catalogues.find((c) => c.id === Number(id))
        return cat ? cat.name : 'Sin catálogo'
    }

    const getStatusName = (id) => {
        if (!id) return 'Sin estado'
        const status = statuses.find((s) => s.id === Number(id))
        return status ? status.name : 'Sin estado'
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        const date = new Date(dateString)
        return date.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' })
    }

    const handleEdit = () => {
        onClose()
        setTimeout(() => {
            if (onEdit) onEdit(product)
        }, 300)
    }

    return (
        <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
            <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingHorizontal: '6%', paddingTop: '9%', paddingBottom: '6%' }}
                >
                    {product ? (
                        <>
                            <View className="flex gap-0 mb-8">
                                <View className="flex flex-row justify-between items-center">
                                    <Text className="text-foreground text-2xl font-medium">Detalles del producto</Text>
                                    <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                        <Ionicons name="close-outline" size={24} color={colors.foreground} />
                                    </Button>
                                </View>
                                <Text className="text-muted-foreground">Información del producto escaneado</Text>
                            </View>

                            <View className="gap-4">
                                <View className="flex-row items-start justify-between">
                                    <Text className="text-[14px] text-muted-foreground w-32 pt-0.5">Nombre</Text>
                                    <Text className="text-[14px] text-foreground text-right flex-1 font-medium" numberOfLines={2}>
                                        {product.nombre || 'N/A'}
                                    </Text>
                                </View>
                                <View className="flex-row items-start justify-between">
                                    <Text className="text-[14px] text-muted-foreground w-32 pt-0.5">Código</Text>
                                    <Text className="text-[14px] text-foreground text-right flex-1" numberOfLines={2}>
                                        {product.codigo || 'N/A'}
                                    </Text>
                                </View>
                                <View className="flex-row items-start justify-between">
                                    <Text className="text-[14px] text-muted-foreground w-32 pt-0.5">Lote</Text>
                                    <Text className="text-[14px] text-foreground text-right flex-1" numberOfLines={2}>
                                        {product.lote || 'N/A'}
                                    </Text>
                                </View>
                                <View className="flex-row items-start justify-between">
                                    <Text className="text-[14px] text-muted-foreground w-32 pt-0.5">Catálogo</Text>
                                    <Text className="text-[14px] text-foreground text-right flex-1" numberOfLines={2}>
                                        {getCatalogueName(product.stockCatalogueId)}
                                    </Text>
                                </View>
                                <View className="flex-row items-start justify-between">
                                    <Text className="text-[14px] text-muted-foreground w-32 pt-0.5">Estado</Text>
                                    <Text className="text-[14px] text-foreground text-right flex-1" numberOfLines={2}>
                                        {getStatusName(product.productStatusId)}
                                    </Text>
                                </View>
                                <View className="flex-row items-start justify-between">
                                    <Text className="text-[14px] text-muted-foreground w-32 pt-0.5">Fecha ingreso</Text>
                                    <Text className="text-[14px] text-foreground text-right flex-1" numberOfLines={2}>
                                        {formatDate(product.fecha)}
                                    </Text>
                                </View>
                                <View className="flex-row items-start justify-between">
                                    <Text className="text-[14px] text-muted-foreground w-32 pt-0.5">Caducidad</Text>
                                    <Text className="text-[14px] text-foreground text-right flex-1" numberOfLines={2}>
                                        {formatDate(product.caducidad)}
                                    </Text>
                                </View>
                                <View className="flex-row items-start justify-between">
                                    <Text className="text-[14px] text-muted-foreground w-32 pt-0.5">Muestreo</Text>
                                    <Text className="text-[14px] text-foreground text-right flex-1" numberOfLines={2}>
                                        {formatDate(product.fechaMuestreo)}
                                    </Text>
                                </View>
                                <View className="flex-row items-start justify-between">
                                    <Text className="text-[14px] text-muted-foreground w-32 pt-0.5">Reanálisis</Text>
                                    <Text
                                        className={`text-[14px] text-right flex-1 ${product.reanalisis ? 'text-foreground' : 'text-muted-foreground italic'}`}
                                        numberOfLines={2}
                                    >
                                        {product.reanalisis ? formatDate(product.reanalisis) : 'No especificado'}
                                    </Text>
                                </View>
                            </View>
                            {isAdmin && (
                                <View className="flex-row justify-end gap-3 pt-8">
                                    <Button className="flex-1" variant="primary" onPress={handleEdit}>
                                        <Ionicons name="create-outline" size={24} color={colors.accentForeground} />
                                        <Button.Label>Editar</Button.Label>
                                    </Button>
                                </View>
                            )}
                        </>
                    ) : (
                        <View className="h-20" />
                    )}
                </ScrollView>
            </View>
        </Modalize>
    )
}

// =====================================================================
// PANTALLA PRINCIPAL - PRODUCTS SCREEN
// =====================================================================
const ProductsScreen = () => {
    const route = useRoute()
    const [isLoading, setIsLoading] = useState(true)
    const [products, setProducts] = useState([])
    const [catalogues, setCatalogues] = useState([])
    const [statuses, setStatuses] = useState([])
    const [unitsOfMeasurement, setUnitsOfMeasurement] = useState([])
    const [warehouseTypes, setWarehouseTypes] = useState([])
    const { colors } = useTheme()
    const { userRole } = useAuth()
    const isAdmin = userRole === 'ADMIN' || userRole === '1'

    // Estados de filtros
    const [searchValue, setSearchValue] = useState('')
    const [sortOption, setSortOption] = useState({ value: 'nombre', label: 'Nombre' })
    const [catalogueFilter, setCatalogueFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [rowsPerPage, setRowsPerPage] = useState('10')
    const [page, setPage] = useState(1)

    // Referencias y estados para Modales
    const filterModalRef = useRef(null)
    const createModalRef = useRef(null)
    const editModalRef = useRef(null)
    const viewQrModalRef = useRef(null)
    const qrScannerModalRef = useRef(null)
    const productDetailsModalRef = useRef(null)
    const alertRef = useRef(null)

    const [productToViewQr, setProductToViewQr] = useState(null)
    const [productToEdit, setProductToEdit] = useState(null)
    const [scannedProduct, setScannedProduct] = useState(null)

    // Handlers para abrir modales
    const openFilterModal = () => filterModalRef.current?.open()
    const openCreateModal = () => {
        requestAnimationFrame(() => {
            createModalRef.current?.open()
        })
    }
    const openViewQrModal = (product) => {
        setProductToViewQr(product)
        setTimeout(() => {
            viewQrModalRef.current?.open()
        }, 0)
    }

    const openQrScannerModal = () => {
        requestAnimationFrame(() => {
            qrScannerModalRef.current?.open()
        })
    }

    const handleScanSuccess = (product) => {
        setScannedProduct(product)
        setTimeout(() => {
            productDetailsModalRef.current?.open()
        }, 300)
    }

    const handleEditFromDetails = (product) => {
        setProductToEdit(product)
        setTimeout(() => {
            editModalRef.current?.open()
        }, 0)
    }

    const fetchData = async () => {
        try {
            setIsLoading(true)

            // Obtener productos
            const productsResponse = await getProducts()
            const productsList = productsResponse?.data?.content || []
            setProducts(productsList)

            // Obtener catálogos
            const cataloguesResponse = await getStockCatalogues()
            // El backend devuelve ResponseObject con data que contiene la lista directamente
            const cataloguesList = Array.isArray(cataloguesResponse?.data) ? cataloguesResponse.data : []
            // Filtrar solo catálogos activos (status === true)
            const activeCatalogues = cataloguesList.filter((cat) => cat.status === true)

            setCatalogues(activeCatalogues)

            // Obtener estados
            const statusesResponse = await getProductStatuses()
            if (statusesResponse?.data) {
                setStatuses(statusesResponse.data)
            }

            // Obtener unidades de medida
            const unitsResponse = await getUnitsOfMeasurement()
            if (unitsResponse?.data) {
                const unitsList = Array.isArray(unitsResponse.data) ? unitsResponse.data : []
                setUnitsOfMeasurement(unitsList)
            }

            // Obtener tipos de almacén
            const warehouseTypesResponse = await getWarehouseTypes()
            if (warehouseTypesResponse?.data) {
                const warehouseTypesList = Array.isArray(warehouseTypesResponse.data) ? warehouseTypesResponse.data : []
                setWarehouseTypes(warehouseTypesList)
            }
        } catch (err) {
            console.error('Error fetch:', err)
            alertRef.current?.show('Error', 'No se pudieron cargar los datos', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Manejar producto escaneado desde navegación
    useFocusEffect(
        React.useCallback(() => {
            const scannedProductFromRoute = route.params?.scannedProduct
            if (scannedProductFromRoute) {
                setScannedProduct(scannedProductFromRoute)
                setTimeout(() => {
                    productDetailsModalRef.current?.open()
                }, 500)
                // Limpiar el parámetro para evitar que se abra cada vez que se enfoque la pantalla
                route.params.scannedProduct = undefined
            }
        }, [route.params]),
    )

    useEffect(() => {
        setPage(1)
    }, [searchValue, catalogueFilter, statusFilter, rowsPerPage])

    const filteredAndSortedItems = useMemo(() => {
        let result = [...products]

        // Filtro de búsqueda
        if (searchValue) {
            const lowerSearch = searchValue.toLowerCase()
            result = result.filter(
                (product) =>
                    product.nombre?.toLowerCase().includes(lowerSearch) ||
                    product.lote?.toLowerCase().includes(lowerSearch) ||
                    product.codigo?.toLowerCase().includes(lowerSearch),
            )
        }

        // Filtro por catálogo
        if (catalogueFilter && catalogueFilter !== 'all') {
            result = result.filter((product) => product.stockCatalogueId === Number(catalogueFilter))
        }

        // Filtro por estado
        if (statusFilter && statusFilter !== 'all') {
            result = result.filter((product) => product.productStatusId === Number(statusFilter))
        }

        // Ordenamiento
        if (sortOption?.value) {
            const key = sortOption.value
            const keyString = (product) => (product[key] || '').toString().toLowerCase()
            result.sort((a, b) => keyString(a).localeCompare(keyString(b)))
        }

        return result
    }, [products, searchValue, catalogueFilter, statusFilter, sortOption])

    const pages = Math.ceil(filteredAndSortedItems.length / Number(rowsPerPage))

    const paginatedItems = useMemo(() => {
        const start = (page - 1) * Number(rowsPerPage)
        return filteredAndSortedItems.slice(start, start + Number(rowsPerPage))
    }, [page, filteredAndSortedItems, rowsPerPage])

    // Función helper para obtener nombre del catálogo
    // Función helper para obtener nombre del catálogo
    const getCatalogueName = (id) => {
        if (!id) return 'Sin catálogo'
        const cat = catalogues.find((c) => c.id === Number(id))
        return cat ? cat.name : 'Sin catálogo'
    }

    // Función helper para obtener nombre del estado
    const getStatusName = (id) => {
        if (!id) return 'Sin estado'
        const status = statuses.find((s) => s.id === Number(id))
        return status ? status.name : 'Sin estado'
    }

    // Función para formatear fecha
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        const date = new Date(dateString)
        return date.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' })
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollableLayout onRefresh={fetchData}>
                <View className="p-[6%] min-h-full">
                    <View className="flex flex-col w-full justify-between shrink-0 gap-4 items-end">
                        <View className="w-full flex flex-row justify-between items-center">
                            <Text className="font-bold text-[32px] text-foreground">Productos</Text>
                            <View className="flex flex-row gap-0 items-center">
                                <Button isIconOnly className="size-12 bg-transparent shrink-0" isDisabled={isLoading} onPress={openQrScannerModal}>
                                    <Ionicons name="scan-outline" size={24} color={colors.accent} />
                                </Button>
                                <Button isIconOnly className="size-12 bg-transparent shrink-0" isDisabled={isLoading} onPress={openFilterModal}>
                                    <Ionicons name="filter-outline" size={24} color={colors.foreground} />
                                </Button>
                                {isAdmin && (
                                    <Button
                                        isIconOnly
                                        className="size-12 font-semibold shrink-0"
                                        variant="primary"
                                        isDisabled={isLoading}
                                        onPress={openCreateModal}
                                    >
                                        <Ionicons name="add-outline" size={24} color={colors.accentForeground} />
                                    </Button>
                                )}
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
                            {(catalogueFilter !== 'all' || statusFilter !== 'all') && (
                                <View className="flex-row items-center bg-surface-1 px-2 py-2 rounded-lg gap-1">
                                    <Ionicons name="funnel-outline" size={12} color={colors.accent} />
                                    <Text className="text-xs font-semibold text-foreground">Filtros</Text>
                                </View>
                            )}
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
                            placeholder="Buscar por nombre, lote o código..."
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
                                            {paginatedItems.map((item) => (
                                                <Accordion.Item
                                                    key={item.id}
                                                    value={item.id}
                                                    className="bg-accent-soft mb-2 rounded-lg overflow-hidden border border-border/20"
                                                >
                                                    {/* HEADER / TRIGGER */}
                                                    <Accordion.Trigger className="w-full bg-accent-soft pl-4 pr-0 py-2">
                                                        <View className="flex-row items-center justify-between w-full">
                                                            {/* TEXTOS: Tipografía solicitada */}
                                                            <View className="flex-1 pr-4 justify-center py-1">
                                                                <Text className="text-foreground font-medium text-lg mb-1" numberOfLines={1}>
                                                                    {item.nombre}
                                                                </Text>
                                                                <Text className="text-muted-foreground text-[14px]" numberOfLines={1}>
                                                                    {item.lote}
                                                                </Text>
                                                            </View>

                                                            {/* ACCIONES: Área de 48x48 (w-12 h-12) con íconos de 24 */}
                                                            <View className="flex flex-row items-center gap-0">
                                                                {item.qrHash && (
                                                                    <TouchableOpacity
                                                                        onPress={() => openViewQrModal(item)}
                                                                        className="w-12 h-12 flex items-center justify-center rounded-full"
                                                                        activeOpacity={0.6}
                                                                    >
                                                                        <Ionicons name="qr-code-outline" size={24} color={colors.accent} />
                                                                    </TouchableOpacity>
                                                                )}

                                                                {isAdmin && (
                                                                    <TouchableOpacity
                                                                        onPress={() => handleEditFromDetails(item)}
                                                                        className="w-12 h-12 flex items-center justify-center rounded-full"
                                                                        activeOpacity={0.6}
                                                                    >
                                                                        <Ionicons name="create-outline" size={24} color={colors.accent} />
                                                                    </TouchableOpacity>
                                                                )}

                                                                {/* Indicador también ajustado al área de toque */}
                                                                <View className="w-12 h-12 flex items-center justify-center">
                                                                    <Accordion.Indicator
                                                                        iconProps={{
                                                                            color: colors.accent,
                                                                            size: 24, // Tamaño solicitado
                                                                        }}
                                                                    />
                                                                </View>
                                                            </View>
                                                        </View>
                                                    </Accordion.Trigger>

                                                    {/* CONTENT: Compacto pero legible */}
                                                    <Accordion.Content className="bg-accent-soft px-4 pb-4">
                                                        {/* Separador sutil */}
                                                        <View className="h-px bg-border/30 mt-0 mb-3" />

                                                        {/* Lista de datos con gap reducido (compacto) */}
                                                        <View className="gap-2">
                                                            <InfoRow label="Nombre" value={item.nombre || 'N/A'} />
                                                            <InfoRow label="Código" value={item.codigo || 'N/A'} />
                                                            <InfoRow label="Catálogo" value={getCatalogueName(item.stockCatalogueId)} />
                                                            <InfoRow label="Estado" value={getStatusName(item.productStatusId)} />
                                                            <InfoRow
                                                                label="Fecha ingreso"
                                                                value={
                                                                    item.fecha
                                                                        ? `${new Date(item.fecha + 'T12:00:00').getDate()} de ${new Date(item.fecha + 'T12:00:00').toLocaleString('es-MX', { month: 'short' }).toUpperCase().replace('.', '')} de ${new Date(item.fecha + 'T12:00:00').getFullYear()}`
                                                                        : 'N/A'
                                                                }
                                                            />
                                                            <InfoRow
                                                                label="Caducidad"
                                                                value={
                                                                    item.caducidad
                                                                        ? `${new Date(item.caducidad + 'T12:00:00').getDate()} de ${new Date(item.caducidad + 'T12:00:00').toLocaleString('es-MX', { month: 'short' }).toUpperCase().replace('.', '')} de ${new Date(item.caducidad + 'T12:00:00').getFullYear()}`
                                                                        : 'N/A'
                                                                }
                                                            />
                                                            <InfoRow
                                                                label="Muestreo"
                                                                value={
                                                                    item.fechaMuestreo
                                                                        ? `${new Date(item.fechaMuestreo + 'T12:00:00').getDate()} de ${new Date(item.fechaMuestreo + 'T12:00:00').toLocaleString('es-MX', { month: 'short' }).toUpperCase().replace('.', '')} de ${new Date(item.fechaMuestreo + 'T12:00:00').getFullYear()}`
                                                                        : 'N/A'
                                                                }
                                                            />
                                                            <InfoRow
                                                                label="Reanálisis"
                                                                value={
                                                                    item.reanalisis
                                                                        ? `${new Date(item.reanalisis + 'T12:00:00').getDate()} de ${new Date(item.reanalisis + 'T12:00:00').toLocaleString('es-MX', { month: 'short' }).toUpperCase().replace('.', '')} de ${new Date(item.reanalisis + 'T12:00:00').getFullYear()}`
                                                                        : 'No especificado'
                                                                }
                                                            />
                                                            {item.loteProveedor && <InfoRow label="Lote Proveedor" value={item.loteProveedor} />}
                                                            {item.fabricante && <InfoRow label="Fabricante" value={item.fabricante} />}
                                                            {item.distribuidor && <InfoRow label="Distribuidor" value={item.distribuidor} />}
                                                            {item.codigoProducto && <InfoRow label="Código producto" value={item.codigoProducto} />}
                                                            {item.numeroAnalisis && <InfoRow label="No. analisis" value={item.numeroAnalisis} />}
                                                            {item.cantidadTotal && <InfoRow label="No. Cantidad" value={item.cantidadTotal} />}
                                                            {item.numeroContenedores && <InfoRow label="No. Contenedores" value={item.numeroContenedores} />}
                                                            {item.warehouseTypeName && <InfoRow label="Almacén" value={item.warehouseTypeName} />}
                                                            {item.unitOfMeasurementName && <InfoRow label="Unidad" value={item.unitOfMeasurementName} />}
                                                            <InfoRow label="Por" value={item.createdByUserName} />
                                                            <InfoRow label="Creado" value={formatDateLiteral(item.createdAt, true)} />
                                                            <InfoRow label="Actualizado" value={formatDateLiteral(item.updatedAt, true)} />
                                                        </View>
                                                    </Accordion.Content>
                                                </Accordion.Item>
                                            ))}
                                        </Accordion>
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
                                    </>
                                ) : (
                                    <Text className="text-center mt-4 text-muted-foreground">No se encontraron productos.</Text>
                                )}
                            </View>
                        </ScrollShadow>
                    )}
                </View>
            </ScrollableLayout>

            <FiltersModalContent
                modalRef={filterModalRef}
                sortOption={sortOption}
                setSortOption={setSortOption}
                catalogueFilter={catalogueFilter}
                setCatalogueFilter={setCatalogueFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                rowsPerPage={rowsPerPage}
                setRowsPerPage={setRowsPerPage}
                setPage={setPage}
                catalogues={catalogues}
                statuses={statuses}
            />
            <CreateProductModalContent
                modalRef={createModalRef}
                onProductCreated={fetchData}
                isLoading={isLoading}
                alertRef={alertRef}
                catalogues={catalogues}
                statuses={statuses}
                unitsOfMeasurement={unitsOfMeasurement}
                warehouseTypes={warehouseTypes}
            />
            <EditProductModalContent
                modalRef={editModalRef}
                product={productToEdit}
                onProductUpdated={fetchData}
                alertRef={alertRef}
                catalogues={catalogues}
                statuses={statuses}
                unitsOfMeasurement={unitsOfMeasurement}
                warehouseTypes={warehouseTypes}
            />
            <QrScannerModalContent modalRef={qrScannerModalRef} onScanSuccess={handleScanSuccess} alertRef={alertRef} />
            <ProductDetailsModalContent
                modalRef={productDetailsModalRef}
                product={scannedProduct}
                onEdit={handleEditFromDetails}
                alertRef={alertRef}
                catalogues={catalogues}
                statuses={statuses}
            />
            <ViewQrModalContent modalRef={viewQrModalRef} product={productToViewQr} alertRef={alertRef} />
            <CustomAlert ref={alertRef} />
        </View>
    )
}

export default ProductsScreen
