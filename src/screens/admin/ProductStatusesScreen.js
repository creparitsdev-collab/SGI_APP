import React, { useEffect, useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react'
import { Text, View, TouchableOpacity, Platform, Dimensions } from 'react-native'
import ScrollableLayout from '../../layouts/ScrollableLayout'
import { Accordion, Button, RadioGroup, ScrollShadow, Spinner, Switch, TextField, useTheme } from 'heroui-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { formatDateLiteral } from '../../utils/utils'
import { Modalize } from 'react-native-modalize'
import { ScrollView } from 'react-native-gesture-handler'
import { required } from '../../utils/validators'
import BackButton from '../../components/BackButton'
// Servicios
import { getProductStatuses, createProductStatus, updateProductStatus, deleteProductStatus } from '../../services/product'
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
// CUSTOM ALERT (Reutilizado)
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
        { label: 'Nombre', value: 'name' },
        { label: 'Fecha Creación', value: 'createdAt' },
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
                                    <RadioGroup.Item
                                        key={opt.value}
                                        value={opt.value}
                                        className="-my-0.5 flex-row items-center p-4 bg-accent-soft rounded-lg border-0"
                                    >
                                        <View className="flex-1">
                                            <RadioGroup.Title className="text-foreground font-medium text-lg">{opt.label}</RadioGroup.Title>
                                        </View>
                                        <RadioGroup.Indicator />
                                    </RadioGroup.Item>
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
                                    <RadioGroup.Item
                                        key={opt.value}
                                        value={opt.value}
                                        className="-my-0.5 flex-row items-center p-4 bg-accent-soft rounded-lg border-0"
                                    >
                                        <View className="flex-1">
                                            <RadioGroup.Title className="text-foreground font-medium text-lg">{opt.label}</RadioGroup.Title>
                                        </View>
                                        <RadioGroup.Indicator />
                                    </RadioGroup.Item>
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
// MODAL DE CREACIÓN
// =====================================================================
const CreateStatusModalContent = ({ modalRef, onStatusCreated, isLoading, alertRef }) => {
    const { colors } = useTheme()
    const [isSaving, setIsSaving] = useState(false)
    const [newStatus, setNewStatus] = useState({
        name: '',
        description: '',
    })
    const [statusErrors, setStatusErrors] = useState({
        name: [],
        description: [],
    })
    const validators = {
        name: [required],
        description: [],
    }
    const runValidators = (value, fns) => fns.map((fn) => fn(value)).filter(Boolean)
    const handleInputChange = (field, value) => {
        setNewStatus((prev) => ({ ...prev, [field]: value }))
        const fns = validators[field] || []
        const errs = runValidators(value, fns)
        setStatusErrors((prev) => ({ ...prev, [field]: errs }))
    }
    const onClose = () => {
        modalRef.current?.close()
        setNewStatus({
            name: '',
            description: '',
        })
        setStatusErrors({
            name: [],
            description: [],
        })
    }
    const handleCreate = async () => {
        // Validación final
        const nameErrs = runValidators(newStatus.name, validators.name)
        if (nameErrs.length > 0) {
            setStatusErrors({
                name: nameErrs,
                description: [],
            })
            alertRef.current?.show('Atención', 'Por favor corrija los errores en el formulario.', 'warning')
            return
        }
        try {
            setIsSaving(true)
            const statusData = {
                name: newStatus.name.trim(),
                description: newStatus.description.trim() || null,
            }
            await createProductStatus(statusData)
            onClose()
            setTimeout(() => {
                alertRef.current?.show('Éxito', 'Estado creado correctamente', 'success')
            }, 300)
            if (onStatusCreated) onStatusCreated()
        } catch (error) {
            console.error('Error create status:', error)
            if (error.response?.data) {
                const { result, title } = error.response.data
                alertRef.current?.show('Error', title || 'Error al crear estado', 'error')
                if (result && Array.isArray(result) && result.length > 0) {
                    const newFieldErrors = {
                        name: [],
                        description: [],
                    }
                    result.forEach((validationError) => {
                        const field = validationError.field
                        const descriptions = validationError.descriptions || []
                        if (newFieldErrors.hasOwnProperty(field)) {
                            newFieldErrors[field] = descriptions
                        }
                    })
                    setStatusErrors(newFieldErrors)
                }
            } else {
                alertRef.current?.show('Error', 'No se pudo crear el estado', 'error')
            }
        } finally {
            setIsSaving(false)
        }
    }
    const hasErrors = () => {
        return statusErrors.name.length > 0 || !newStatus.name.trim()
    }
    return (
        <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
            <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingHorizontal: '6%', paddingTop: '9%', paddingBottom: '6%' }}
                >
                    <View className="flex gap-0 mb-8">
                        <View className="flex flex-row justify-between items-center">
                            <Text className="text-foreground text-2xl font-medium">Registrar estado</Text>
                            <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                <Ionicons name="close-outline" size={24} color={colors.foreground} />
                            </Button>
                        </View>
                        <Text className="text-muted-foreground">Ingrese los datos del nuevo estado</Text>
                    </View>
                    <View className="gap-6">
                        {/* NOMBRE */}
                        <TextField isRequired isInvalid={statusErrors.name.length > 0}>
                            <View className="flex-row justify-between items-center mb-2">
                                <TextField.Label className="text-foreground font-medium">Nombre</TextField.Label>
                                <Text className="text-muted-foreground text-xs">{newStatus.name.length} / 255</Text>
                            </View>
                            <TextField.Input
                                colors={{
                                    blurBackground: colors.accentSoft,
                                    focusBackground: colors.surface2,
                                    blurBorder: statusErrors.name.length > 0 ? colors.danger : colors.accentSoft,
                                    focusBorder: statusErrors.name.length > 0 ? colors.danger : colors.surface2,
                                }}
                                placeholder="Nombre del estado"
                                value={newStatus.name}
                                onChangeText={(text) => handleInputChange('name', text)}
                                cursorColor={colors.accent}
                                selectionHandleColor={colors.accent}
                                selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                maxLength={255}
                            >
                                <TextField.InputEndContent>
                                    {statusErrors.name.length === 0 && newStatus.name.trim() ? (
                                        <Ionicons name="checkmark" size={24} color={colors.accent} />
                                    ) : statusErrors.name.length > 0 ? (
                                        <Ionicons name="close" size={24} color={colors.danger} />
                                    ) : null}
                                </TextField.InputEndContent>
                            </TextField.Input>
                            {statusErrors.name.length > 0 ? <TextField.ErrorMessage>{statusErrors.name.join('\n')}</TextField.ErrorMessage> : undefined}
                        </TextField>
                        {/* DESCRIPCIÓN */}
                        <TextField isInvalid={statusErrors.description.length > 0}>
                            <View className="flex-row justify-between items-center mb-2">
                                <TextField.Label className="text-foreground font-medium">Descripción</TextField.Label>
                                <Text className="text-muted-foreground text-xs">{newStatus.description.length} / 500</Text>
                            </View>
                            <TextField.Input
                                colors={{
                                    blurBackground: colors.accentSoft,
                                    focusBackground: colors.surface2,
                                    blurBorder: statusErrors.description.length > 0 ? colors.danger : colors.accentSoft,
                                    focusBorder: statusErrors.description.length > 0 ? colors.danger : colors.surface2,
                                }}
                                placeholder="Descripción (Opcional)"
                                value={newStatus.description}
                                onChangeText={(text) => handleInputChange('description', text)}
                                cursorColor={colors.accent}
                                selectionHandleColor={colors.accent}
                                selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                maxLength={500}
                                multiline
                                numberOfLines={3}
                            />
                            {statusErrors.description.length > 0 ? (
                                <TextField.ErrorMessage>{statusErrors.description.join('\n')}</TextField.ErrorMessage>
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
    )
}
// =====================================================================
// MODAL DE EDICIÓN
// =====================================================================
const EditStatusModalContent = ({ modalRef, status, onStatusUpdated, alertRef }) => {
    const { colors } = useTheme()
    const [isSaving, setIsSaving] = useState(false)
    const [editedStatus, setEditedStatus] = useState({
        id: '',
        name: '',
        description: '',
    })
    const [statusErrors, setStatusErrors] = useState({
        name: [],
        description: [],
    })
    const validators = {
        name: [required],
        description: [],
    }
    const runValidators = (value, fns) => fns.map((fn) => fn(value)).filter(Boolean)
    const handleInputChange = (field, value) => {
        setEditedStatus((prev) => ({ ...prev, [field]: value }))
        const fns = validators[field] || []
        const errs = runValidators(value, fns)
        setStatusErrors((prev) => ({ ...prev, [field]: errs }))
    }
    useEffect(() => {
        if (status) {
            setEditedStatus({
                id: status.id,
                name: status.name || '',
                description: status.description || '',
            })
            setStatusErrors({
                name: [],
                description: [],
            })
        }
    }, [status])
    const onClose = () => modalRef.current?.close()
    const handleSave = async () => {
        // Validación final
        const nameErrs = runValidators(editedStatus.name, validators.name)
        if (nameErrs.length > 0) {
            setStatusErrors({
                name: nameErrs,
                description: [],
            })
            alertRef.current?.show('Atención', 'Por favor corrija los errores en el formulario.', 'warning')
            return
        }
        try {
            setIsSaving(true)
            const statusData = {
                id: editedStatus.id,
                name: editedStatus.name.trim(),
                description: editedStatus.description.trim() || null,
            }
            const response = await updateProductStatus(statusData)
            if (response.type === 'SUCCESS') {
                onClose()
                setTimeout(() => {
                    alertRef.current?.show('Éxito', `Estado ${editedStatus.name} actualizado correctamente`, 'success')
                }, 300)
                if (onStatusUpdated) onStatusUpdated()
            } else {
                alertRef.current?.show('Error', 'No se pudo actualizar el estado', 'error')
            }
        } catch (error) {
            console.error('Error update status:', error)
            if (error.response?.data) {
                const { result, title } = error.response.data
                alertRef.current?.show('Error', title || 'Error al actualizar', 'error')
                if (result && Array.isArray(result) && result.length > 0) {
                    const newFieldErrors = {
                        name: [],
                        description: [],
                    }
                    result.forEach((validationError) => {
                        const field = validationError.field
                        const descriptions = validationError.descriptions || []
                        if (newFieldErrors.hasOwnProperty(field)) {
                            newFieldErrors[field] = descriptions
                        }
                    })
                    setStatusErrors(newFieldErrors)
                }
            } else {
                alertRef.current?.show('Error', 'Error al actualizar', 'error')
            }
        } finally {
            setIsSaving(false)
        }
    }
    const hasErrors = () => {
        return statusErrors.name.length > 0 || !editedStatus.name.trim()
    }
    return (
        <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
            <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingHorizontal: '6%', paddingTop: '9%', paddingBottom: '6%' }}
                >
                    {status ? (
                        <>
                            <View className="flex gap-0 mb-8">
                                <View className="flex flex-row justify-between items-center">
                                    <Text className="text-foreground text-2xl font-medium">Editar estado</Text>
                                    <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                        <Ionicons name="close-outline" size={24} color={colors.foreground} />
                                    </Button>
                                </View>
                                <Text className="text-muted-foreground">Edite los datos del estado</Text>
                            </View>
                            <View className="gap-6">
                                {/* NOMBRE */}
                                <TextField isRequired isInvalid={statusErrors.name.length > 0}>
                                    <View className="flex-row justify-between items-center mb-2">
                                        <TextField.Label className="text-foreground font-medium">Nombre</TextField.Label>
                                        <Text className="text-muted-foreground text-xs">{editedStatus.name.length} / 255</Text>
                                    </View>
                                    <TextField.Input
                                        colors={{
                                            blurBackground: colors.accentSoft,
                                            focusBackground: colors.surface2,
                                            blurBorder: statusErrors.name.length > 0 ? colors.danger : colors.accentSoft,
                                            focusBorder: statusErrors.name.length > 0 ? colors.danger : colors.surface2,
                                        }}
                                        placeholder="Nombre del estado"
                                        value={editedStatus.name}
                                        onChangeText={(text) => handleInputChange('name', text)}
                                        cursorColor={colors.accent}
                                        selectionHandleColor={colors.accent}
                                        selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                        maxLength={255}
                                    >
                                        <TextField.InputEndContent>
                                            {statusErrors.name.length === 0 && editedStatus.name.trim() ? (
                                                <Ionicons name="checkmark" size={24} color={colors.accent} />
                                            ) : statusErrors.name.length > 0 ? (
                                                <Ionicons name="close" size={24} color={colors.danger} />
                                            ) : null}
                                        </TextField.InputEndContent>
                                    </TextField.Input>
                                    {statusErrors.name.length > 0 ? <TextField.ErrorMessage>{statusErrors.name.join('\n')}</TextField.ErrorMessage> : undefined}
                                </TextField>
                                {/* DESCRIPCIÓN */}
                                <TextField isInvalid={statusErrors.description.length > 0}>
                                    <View className="flex-row justify-between items-center mb-2">
                                        <TextField.Label className="text-foreground font-medium">Descripción</TextField.Label>
                                        <Text className="text-muted-foreground text-xs">{editedStatus.description.length} / 500</Text>
                                    </View>
                                    <TextField.Input
                                        colors={{
                                            blurBackground: colors.accentSoft,
                                            focusBackground: colors.surface2,
                                            blurBorder: statusErrors.description.length > 0 ? colors.danger : colors.accentSoft,
                                            focusBorder: statusErrors.description.length > 0 ? colors.danger : colors.surface2,
                                        }}
                                        placeholder="Descripción (Opcional)"
                                        value={editedStatus.description}
                                        onChangeText={(text) => handleInputChange('description', text)}
                                        cursorColor={colors.accent}
                                        selectionHandleColor={colors.accent}
                                        selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                        maxLength={500}
                                        multiline
                                        numberOfLines={3}
                                    />
                                    {statusErrors.description.length > 0 ? (
                                        <TextField.ErrorMessage>{statusErrors.description.join('\n')}</TextField.ErrorMessage>
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
    )
}
// =====================================================================
// MODAL DE ELIMINACIÓN
// =====================================================================
const DeleteStatusModalContent = ({ modalRef, status, onStatusDeleted, alertRef }) => {
    const { colors } = useTheme()
    const [isDeleting, setIsDeleting] = useState(false)
    const onClose = () => modalRef.current?.close()
    const handleDelete = async () => {
        try {
            setIsDeleting(true)
            const response = await deleteProductStatus(status.id)
            if (response.type === 'SUCCESS') {
                onClose()
                setTimeout(() => {
                    alertRef.current?.show('Éxito', 'Estado eliminado correctamente', 'success')
                }, 300)
                if (onStatusDeleted) onStatusDeleted()
            } else {
                alertRef.current?.show('Error', 'No se pudo eliminar el estado', 'error')
            }
        } catch (error) {
            alertRef.current?.show('Error', 'Error al eliminar estado', 'error')
        } finally {
            setIsDeleting(false)
        }
    }
    return (
        <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
            <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingHorizontal: '6%', paddingTop: '9%', paddingBottom: '6%' }}
                >
                    {status ? (
                        <View>
                            <View className="flex gap-0 mb-8">
                                <View className="flex flex-row justify-between items-center">
                                    <Text className="text-foreground text-2xl font-medium">¿Eliminar estado?</Text>
                                    <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                        <Ionicons name="close-outline" size={24} color={colors.foreground} />
                                    </Button>
                                </View>
                                <Text className="text-muted-foreground">
                                    ¿Está seguro que desea eliminar el estado "{status.name}"? Esta acción no se puede deshacer.
                                </Text>
                            </View>
                            <View className="flex-row justify-end gap-3">
                                <Button className="flex-1" variant="primary" onPress={handleDelete} isDisabled={isDeleting}>
                                    {isDeleting ? (
                                        <>
                                            <Spinner color={colors.accentForeground} size="md" />
                                            <Button.Label>Eliminando...</Button.Label>
                                        </>
                                    ) : (
                                        <>
                                            <Ionicons name="trash-outline" size={24} color={colors.accentForeground} />
                                            <Button.Label>Eliminar</Button.Label>
                                        </>
                                    )}
                                </Button>
                            </View>
                        </View>
                    ) : (
                        <View className="h-20" />
                    )}
                </ScrollView>
            </View>
        </Modalize>
    )
}
// =====================================================================
// PANTALLA PRINCIPAL - PRODUCT STATUSES SCREEN
// =====================================================================
const ProductStatusesScreen = () => {
    const [isLoading, setIsLoading] = useState(true)
    const [statuses, setStatuses] = useState([])
    const { colors } = useTheme()
    // Estados de filtros
    const [searchValue, setSearchValue] = useState('')
    const [sortOption, setSortOption] = useState({ value: 'name', label: 'Nombre' })
    const [rowsPerPage, setRowsPerPage] = useState('10')
    const [page, setPage] = useState(1)
    // Referencias y estados para Modales
    const filterModalRef = useRef(null)
    const createModalRef = useRef(null)
    const editModalRef = useRef(null)
    const deleteModalRef = useRef(null)
    const alertRef = useRef(null)
    const [statusToEdit, setStatusToEdit] = useState(null)
    const [statusToDelete, setStatusToDelete] = useState(null)
    // Handlers para abrir modales
    const openFilterModal = () => filterModalRef.current?.open()
    const openCreateModal = () => {
        requestAnimationFrame(() => {
            createModalRef.current?.open()
        })
    }
    const openEditModal = (status) => {
        setStatusToEdit(status)
        setTimeout(() => {
            editModalRef.current?.open()
        }, 0)
    }
    const openDeleteModal = (status) => {
        setStatusToDelete(status)
        setTimeout(() => {
            deleteModalRef.current?.open()
        }, 0)
    }
    const fetchData = async () => {
        try {
            setIsLoading(true)
            const response = await getProductStatuses()
            // El backend devuelve ResponseObject con data que contiene la lista
            const list = Array.isArray(response?.data) ? response.data : []
            setStatuses(list)
        } catch (err) {
            console.error('Error fetch:', err)
            alertRef.current?.show('Error', 'No se pudieron cargar los estados', 'error')
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
        let result = [...statuses]
        // Filtro de búsqueda
        if (searchValue) {
            const lowerSearch = searchValue.toLowerCase()
            result = result.filter((status) => status.name?.toLowerCase().includes(lowerSearch) || status.description?.toLowerCase().includes(lowerSearch))
        }
        // Ordenamiento
        if (sortOption?.value) {
            const key = sortOption.value
            result.sort((a, b) => {
                const aVal = a[key]
                const bVal = b[key]
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return aVal - bVal
                }
                const aStr = (aVal || '').toString().toLowerCase()
                const bStr = (bVal || '').toString().toLowerCase()
                return aStr.localeCompare(bStr)
            })
        }
        return result
    }, [statuses, searchValue, sortOption])
    const pages = Math.ceil(filteredAndSortedItems.length / Number(rowsPerPage))
    const paginatedItems = useMemo(() => {
        const start = (page - 1) * Number(rowsPerPage)
        return filteredAndSortedItems.slice(start, start + Number(rowsPerPage))
    }, [page, filteredAndSortedItems, rowsPerPage])
    return (
        <View style={{ flex: 1 }}>
            <ScrollableLayout onRefresh={fetchData}>
                <View className="p-[6%] min-h-full">
                    <View className="flex flex-col w-full justify-between shrink-0 gap-4 items-end">
                        <View className="w-full flex flex-row justify-between items-center">
                            <View className="flex flex-row items-center justify-center gap-2">
                                <BackButton />
                                <Text className="font-bold text-[32px] text-foreground">Estados</Text>
                            </View>
                            <View className="flex flex-row gap-0 items-center">
                                <Button isIconOnly className="size-12 bg-transparent shrink-0" isDisabled={isLoading} onPress={openFilterModal}>
                                    <Ionicons name="filter-outline" size={24} color={colors.foreground} />
                                </Button>
                                <Button
                                    isIconOnly
                                    className="size-12 font-semibold shrink-0"
                                    variant="primary"
                                    isDisabled={isLoading}
                                    onPress={openCreateModal}
                                >
                                    <Ionicons name="add-outline" size={24} color={colors.accentForeground} />
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
                            placeholder="Buscar por nombre o descripción..."
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
                                                    <Accordion.Trigger className="w-full bg-accent-soft pl-4 pr-0 py-2">
                                                        <View className="flex-row items-center justify-between w-full">
                                                            {/* TEXTOS */}
                                                            <View className="flex-1 pr-2 justify-center py-1">
                                                                <Text className="text-foreground font-medium text-lg mb-1" numberOfLines={1}>
                                                                    {item.name}
                                                                </Text>
                                                                {item.description && (
                                                                    <Text className="text-muted-foreground text-[14px]" numberOfLines={1}>
                                                                        {item.description}
                                                                    </Text>
                                                                )}
                                                            </View>

                                                            {/* ACCIONES */}
                                                            <View className="flex flex-row items-center gap-0">
                                                                <TouchableOpacity
                                                                    onPress={() => openDeleteModal(item)}
                                                                    className="w-12 h-12 flex items-center justify-center rounded-full"
                                                                    activeOpacity={0.6}
                                                                >
                                                                    <Ionicons name="trash-outline" size={24} color={colors.accent} />
                                                                </TouchableOpacity>

                                                                <TouchableOpacity
                                                                    onPress={() => openEditModal(item)}
                                                                    className="w-12 h-12 flex items-center justify-center rounded-full"
                                                                    activeOpacity={0.6}
                                                                >
                                                                    <Ionicons name="create-outline" size={24} color={colors.accent} />
                                                                </TouchableOpacity>
                                                                {/* Indicador también ajustado al área de toque */}
                                                                <View className="w-12 h-12 flex items-center justify-center">
                                                                    <Accordion.Indicator
                                                                        iconProps={{
                                                                            color: colors.accent,
                                                                            size: 24,
                                                                        }}
                                                                    />
                                                                </View>
                                                            </View>
                                                        </View>
                                                    </Accordion.Trigger>
                                                    <Accordion.Content className="bg-accent-soft px-4 pb-4">
                                                        {/* Separador sutil */}
                                                        <View className="h-px bg-border/30 mt-0 mb-3" />

                                                        {/* Lista de datos con gap reducido (compacto) */}
                                                        <View className="gap-2">
                                                            {item.description && <InfoRow label="Descripción" value={item.description} />}
                                                            <InfoRow label="Por" value={item.createdByUserName} />
                                                            <InfoRow label="Creado" value={formatDateLiteral(item.createdAt, true)} />
                                                            <InfoRow label="Actualizado" value={formatDateLiteral(item.updatedAt, true)} />
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
                                        <Ionicons name="shield-outline" size={64} color={colors.muted} />
                                        <Text className="text-muted-foreground text-lg mt-4">No se encontraron estados</Text>
                                        <Text className="text-muted-foreground text-center mt-2 px-8">
                                            {searchValue ? 'Intente con otros términos de búsqueda' : 'Comience creando un nuevo estado'}
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
            <CreateStatusModalContent modalRef={createModalRef} onStatusCreated={fetchData} isLoading={isLoading} alertRef={alertRef} />
            <EditStatusModalContent modalRef={editModalRef} status={statusToEdit} onStatusUpdated={fetchData} alertRef={alertRef} />
            <DeleteStatusModalContent modalRef={deleteModalRef} status={statusToDelete} onStatusDeleted={fetchData} alertRef={alertRef} />
            <CustomAlert ref={alertRef} />
        </View>
    )
}
export default ProductStatusesScreen
