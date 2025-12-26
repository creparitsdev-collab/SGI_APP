import React, { useEffect, useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react'
import { Text, View, TouchableOpacity, Platform, Dimensions } from 'react-native'
import ScrollableLayout from '../../layouts/ScrollableLayout'
import { Accordion, Button, RadioGroup, ScrollShadow, Spinner, TextField, useTheme } from 'heroui-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { formatDateLiteral } from '../../utils/utils'
import { Modalize } from 'react-native-modalize'
import { ScrollView } from 'react-native-gesture-handler'
import { required } from '../../utils/validators'
import BackButton from '../../components/BackButton'
// Servicios
import { getUnitsOfMeasurement, createUnitOfMeasurement, updateUnitOfMeasurement, deleteUnitOfMeasurement } from '../../services/unitOfMeasurement'

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
        { label: 'Código', value: 'code' },
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
const CreateUnitModalContent = ({ modalRef, onUnitCreated, isLoading, alertRef }) => {
    const { colors } = useTheme()
    const [isSaving, setIsSaving] = useState(false)
    const [newUnit, setNewUnit] = useState({
        name: '',
        code: '',
        description: '',
    })
    const [unitErrors, setUnitErrors] = useState({
        name: [],
        code: [],
        description: [],
    })
    const validators = {
        name: [required],
        code: [required],
        description: [],
    }
    const runValidators = (value, fns) => fns.map((fn) => fn(value)).filter(Boolean)
    const handleInputChange = (field, value) => {
        setNewUnit((prev) => ({ ...prev, [field]: value }))
        const fns = validators[field] || []
        const errs = runValidators(value, fns)
        setUnitErrors((prev) => ({ ...prev, [field]: errs }))
    }
    const onClose = () => {
        modalRef.current?.close()
        setNewUnit({
            name: '',
            code: '',
            description: '',
        })
        setUnitErrors({
            name: [],
            code: [],
            description: [],
        })
    }
    const handleCreate = async () => {
        const nameErrs = runValidators(newUnit.name, validators.name)
        const codeErrs = runValidators(newUnit.code, validators.code)
        if (nameErrs.length > 0 || codeErrs.length > 0) {
            setUnitErrors({
                name: nameErrs,
                code: codeErrs,
                description: [],
            })
            alertRef.current?.show('Atención', 'Por favor corrija los errores en el formulario.', 'warning')
            return
        }
        try {
            setIsSaving(true)
            const unitData = {
                name: newUnit.name.trim(),
                code: newUnit.code.trim(),
                description: newUnit.description.trim() || null,
            }
            await createUnitOfMeasurement(unitData)
            onClose()
            setTimeout(() => {
                alertRef.current?.show('Éxito', 'Unidad de medida creada correctamente', 'success')
            }, 300)
            if (onUnitCreated) onUnitCreated()
        } catch (error) {
            console.error('Error create unit:', error)
            if (error.response?.data) {
                const { result, title } = error.response.data
                alertRef.current?.show('Error', title || 'Error al crear unidad', 'error')
                if (result && Array.isArray(result) && result.length > 0) {
                    const newFieldErrors = {
                        name: [],
                        code: [],
                        description: [],
                    }
                    result.forEach((validationError) => {
                        const field = validationError.field
                        const descriptions = validationError.descriptions || []
                        if (newFieldErrors.hasOwnProperty(field)) {
                            newFieldErrors[field] = descriptions
                        }
                    })
                    setUnitErrors(newFieldErrors)
                }
            } else {
                alertRef.current?.show('Error', 'No se pudo crear la unidad', 'error')
            }
        } finally {
            setIsSaving(false)
        }
    }
    const hasErrors = () => {
        return unitErrors.name.length > 0 || unitErrors.code.length > 0 || !newUnit.name.trim() || !newUnit.code.trim()
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
                            <Text className="text-foreground text-2xl font-medium">Registrar unidad</Text>
                            <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                <Ionicons name="close-outline" size={24} color={colors.foreground} />
                            </Button>
                        </View>
                        <Text className="text-muted-foreground">Ingrese los datos de la nueva unidad</Text>
                    </View>
                    <View className="gap-6">
                        <TextField isRequired isInvalid={unitErrors.name.length > 0}>
                            <View className="flex-row justify-between items-center mb-2">
                                <TextField.Label className="text-foreground font-medium">Nombre</TextField.Label>
                                <Text className="text-muted-foreground text-xs">{newUnit.name.length} / 100</Text>
                            </View>
                            <TextField.Input
                                colors={{
                                    blurBackground: colors.accentSoft,
                                    focusBackground: colors.surface2,
                                    blurBorder: unitErrors.name.length > 0 ? colors.danger : colors.accentSoft,
                                    focusBorder: unitErrors.name.length > 0 ? colors.danger : colors.surface2,
                                }}
                                placeholder="Ej: Kilogramo, Litro, Metro"
                                value={newUnit.name}
                                onChangeText={(text) => handleInputChange('name', text)}
                                cursorColor={colors.accent}
                                selectionHandleColor={colors.accent}
                                selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                maxLength={100}
                            >
                                <TextField.InputEndContent>
                                    {unitErrors.name.length === 0 && newUnit.name.trim() ? (
                                        <Ionicons name="checkmark" size={24} color={colors.accent} />
                                    ) : unitErrors.name.length > 0 ? (
                                        <Ionicons name="close" size={24} color={colors.danger} />
                                    ) : null}
                                </TextField.InputEndContent>
                            </TextField.Input>
                            {unitErrors.name.length > 0 ? <TextField.ErrorMessage>{unitErrors.name.join('\n')}</TextField.ErrorMessage> : undefined}
                        </TextField>

                        <TextField isRequired isInvalid={unitErrors.code.length > 0}>
                            <View className="flex-row justify-between items-center mb-2">
                                <TextField.Label className="text-foreground font-medium">Código</TextField.Label>
                                <Text className="text-muted-foreground text-xs">{newUnit.code.length} / 20</Text>
                            </View>
                            <TextField.Input
                                colors={{
                                    blurBackground: colors.accentSoft,
                                    focusBackground: colors.surface2,
                                    blurBorder: unitErrors.code.length > 0 ? colors.danger : colors.accentSoft,
                                    focusBorder: unitErrors.code.length > 0 ? colors.danger : colors.surface2,
                                }}
                                placeholder="Ej: kg, L, m"
                                value={newUnit.code}
                                onChangeText={(text) => handleInputChange('code', text)}
                                cursorColor={colors.accent}
                                selectionHandleColor={colors.accent}
                                selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                maxLength={20}
                            >
                                <TextField.InputEndContent>
                                    {unitErrors.code.length === 0 && newUnit.code.trim() ? (
                                        <Ionicons name="checkmark" size={24} color={colors.accent} />
                                    ) : unitErrors.code.length > 0 ? (
                                        <Ionicons name="close" size={24} color={colors.danger} />
                                    ) : null}
                                </TextField.InputEndContent>
                            </TextField.Input>
                            {unitErrors.code.length > 0 ? <TextField.ErrorMessage>{unitErrors.code.join('\n')}</TextField.ErrorMessage> : undefined}
                        </TextField>

                        <TextField isInvalid={unitErrors.description.length > 0}>
                            <View className="flex-row justify-between items-center mb-2">
                                <TextField.Label className="text-foreground font-medium">Descripción</TextField.Label>
                                <Text className="text-muted-foreground text-xs">{newUnit.description.length} / 500</Text>
                            </View>
                            <TextField.Input
                                colors={{
                                    blurBackground: colors.accentSoft,
                                    focusBackground: colors.surface2,
                                    blurBorder: unitErrors.description.length > 0 ? colors.danger : colors.accentSoft,
                                    focusBorder: unitErrors.description.length > 0 ? colors.danger : colors.surface2,
                                }}
                                placeholder="Descripción (Opcional)"
                                value={newUnit.description}
                                onChangeText={(text) => handleInputChange('description', text)}
                                cursorColor={colors.accent}
                                selectionHandleColor={colors.accent}
                                selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                maxLength={500}
                                multiline
                                numberOfLines={3}
                            />
                            {unitErrors.description.length > 0 ? (
                                <TextField.ErrorMessage>{unitErrors.description.join('\n')}</TextField.ErrorMessage>
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
const EditUnitModalContent = ({ modalRef, unit, onUnitUpdated, alertRef }) => {
    const { colors } = useTheme()
    const [isSaving, setIsSaving] = useState(false)
    const [editedUnit, setEditedUnit] = useState({
        id: '',
        name: '',
        code: '',
        description: '',
    })
    const [unitErrors, setUnitErrors] = useState({
        name: [],
        code: [],
        description: [],
    })
    const validators = {
        name: [required],
        code: [required],
        description: [],
    }
    const runValidators = (value, fns) => fns.map((fn) => fn(value)).filter(Boolean)
    const handleInputChange = (field, value) => {
        setEditedUnit((prev) => ({ ...prev, [field]: value }))
        const fns = validators[field] || []
        const errs = runValidators(value, fns)
        setUnitErrors((prev) => ({ ...prev, [field]: errs }))
    }
    useEffect(() => {
        if (unit) {
            setEditedUnit({
                id: unit.id,
                name: unit.name || '',
                code: unit.code || '',
                description: unit.description || '',
            })
            setUnitErrors({
                name: [],
                code: [],
                description: [],
            })
        }
    }, [unit])
    const onClose = () => modalRef.current?.close()
    const handleSave = async () => {
        const nameErrs = runValidators(editedUnit.name, validators.name)
        const codeErrs = runValidators(editedUnit.code, validators.code)
        if (nameErrs.length > 0 || codeErrs.length > 0) {
            setUnitErrors({
                name: nameErrs,
                code: codeErrs,
                description: [],
            })
            alertRef.current?.show('Atención', 'Por favor corrija los errores en el formulario.', 'warning')
            return
        }
        try {
            setIsSaving(true)
            const unitData = {
                id: editedUnit.id,
                name: editedUnit.name.trim(),
                code: editedUnit.code.trim(),
                description: editedUnit.description.trim() || null,
            }
            const response = await updateUnitOfMeasurement(editedUnit.id, unitData)
            if (response.type === 'SUCCESS') {
                onClose()
                setTimeout(() => {
                    alertRef.current?.show('Éxito', `Unidad ${editedUnit.name} actualizada correctamente`, 'success')
                }, 300)
                if (onUnitUpdated) onUnitUpdated()
            } else {
                alertRef.current?.show('Error', 'No se pudo actualizar la unidad', 'error')
            }
        } catch (error) {
            console.error('Error update unit:', error)
            if (error.response?.data) {
                const { result, title } = error.response.data
                alertRef.current?.show('Error', title || 'Error al actualizar', 'error')
                if (result && Array.isArray(result) && result.length > 0) {
                    const newFieldErrors = {
                        name: [],
                        code: [],
                        description: [],
                    }
                    result.forEach((validationError) => {
                        const field = validationError.field
                        const descriptions = validationError.descriptions || []
                        if (newFieldErrors.hasOwnProperty(field)) {
                            newFieldErrors[field] = descriptions
                        }
                    })
                    setUnitErrors(newFieldErrors)
                }
            } else {
                alertRef.current?.show('Error', 'Error al actualizar', 'error')
            }
        } finally {
            setIsSaving(false)
        }
    }
    const hasErrors = () => {
        return unitErrors.name.length > 0 || unitErrors.code.length > 0 || !editedUnit.name.trim() || !editedUnit.code.trim()
    }
    return (
        <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
            <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingHorizontal: '6%', paddingTop: '9%', paddingBottom: '6%' }}
                >
                    {unit ? (
                        <>
                            <View className="flex gap-0 mb-8">
                                <View className="flex flex-row justify-between items-center">
                                    <Text className="text-foreground text-2xl font-medium">Editar unidad</Text>
                                    <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                        <Ionicons name="close-outline" size={24} color={colors.foreground} />
                                    </Button>
                                </View>
                                <Text className="text-muted-foreground">Edite los datos de la unidad</Text>
                            </View>
                            <View className="gap-6">
                                <TextField isRequired isInvalid={unitErrors.name.length > 0}>
                                    <View className="flex-row justify-between items-center mb-2">
                                        <TextField.Label className="text-foreground font-medium">Nombre</TextField.Label>
                                        <Text className="text-muted-foreground text-xs">{editedUnit.name.length} / 100</Text>
                                    </View>
                                    <TextField.Input
                                        colors={{
                                            blurBackground: colors.accentSoft,
                                            focusBackground: colors.surface2,
                                            blurBorder: unitErrors.name.length > 0 ? colors.danger : colors.accentSoft,
                                            focusBorder: unitErrors.name.length > 0 ? colors.danger : colors.surface2,
                                        }}
                                        placeholder="Nombre de la unidad"
                                        value={editedUnit.name}
                                        onChangeText={(text) => handleInputChange('name', text)}
                                        cursorColor={colors.accent}
                                        selectionHandleColor={colors.accent}
                                        selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                        maxLength={100}
                                    >
                                        <TextField.InputEndContent>
                                            {unitErrors.name.length === 0 && editedUnit.name.trim() ? (
                                                <Ionicons name="checkmark" size={24} color={colors.accent} />
                                            ) : unitErrors.name.length > 0 ? (
                                                <Ionicons name="close" size={24} color={colors.danger} />
                                            ) : null}
                                        </TextField.InputEndContent>
                                    </TextField.Input>
                                    {unitErrors.name.length > 0 ? <TextField.ErrorMessage>{unitErrors.name.join('\n')}</TextField.ErrorMessage> : undefined}
                                </TextField>

                                <TextField isRequired isInvalid={unitErrors.code.length > 0}>
                                    <View className="flex-row justify-between items-center mb-2">
                                        <TextField.Label className="text-foreground font-medium">Código</TextField.Label>
                                        <Text className="text-muted-foreground text-xs">{editedUnit.code.length} / 20</Text>
                                    </View>
                                    <TextField.Input
                                        colors={{
                                            blurBackground: colors.accentSoft,
                                            focusBackground: colors.surface2,
                                            blurBorder: unitErrors.code.length > 0 ? colors.danger : colors.accentSoft,
                                            focusBorder: unitErrors.code.length > 0 ? colors.danger : colors.surface2,
                                        }}
                                        placeholder="Código"
                                        value={editedUnit.code}
                                        onChangeText={(text) => handleInputChange('code', text)}
                                        cursorColor={colors.accent}
                                        selectionHandleColor={colors.accent}
                                        selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                        maxLength={20}
                                    >
                                        <TextField.InputEndContent>
                                            {unitErrors.code.length === 0 && editedUnit.code.trim() ? (
                                                <Ionicons name="checkmark" size={24} color={colors.accent} />
                                            ) : unitErrors.code.length > 0 ? (
                                                <Ionicons name="close" size={24} color={colors.danger} />
                                            ) : null}
                                        </TextField.InputEndContent>
                                    </TextField.Input>
                                    {unitErrors.code.length > 0 ? <TextField.ErrorMessage>{unitErrors.code.join('\n')}</TextField.ErrorMessage> : undefined}
                                </TextField>

                                <TextField isInvalid={unitErrors.description.length > 0}>
                                    <View className="flex-row justify-between items-center mb-2">
                                        <TextField.Label className="text-foreground font-medium">Descripción</TextField.Label>
                                        <Text className="text-muted-foreground text-xs">{editedUnit.description.length} / 500</Text>
                                    </View>
                                    <TextField.Input
                                        colors={{
                                            blurBackground: colors.accentSoft,
                                            focusBackground: colors.surface2,
                                            blurBorder: unitErrors.description.length > 0 ? colors.danger : colors.accentSoft,
                                            focusBorder: unitErrors.description.length > 0 ? colors.danger : colors.surface2,
                                        }}
                                        placeholder="Descripción (Opcional)"
                                        value={editedUnit.description}
                                        onChangeText={(text) => handleInputChange('description', text)}
                                        cursorColor={colors.accent}
                                        selectionHandleColor={colors.accent}
                                        selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                        maxLength={500}
                                        multiline
                                        numberOfLines={3}
                                    />
                                    {unitErrors.description.length > 0 ? (
                                        <TextField.ErrorMessage>{unitErrors.description.join('\n')}</TextField.ErrorMessage>
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
const DeleteUnitModalContent = ({ modalRef, unit, onUnitDeleted, alertRef }) => {
    const { colors } = useTheme()
    const [isDeleting, setIsDeleting] = useState(false)
    const onClose = () => modalRef.current?.close()
    const handleDelete = async () => {
        try {
            setIsDeleting(true)
            const response = await deleteUnitOfMeasurement(unit.id)
            if (response.type === 'SUCCESS') {
                onClose()
                setTimeout(() => {
                    alertRef.current?.show('Éxito', 'Unidad eliminada correctamente', 'success')
                }, 300)
                if (onUnitDeleted) onUnitDeleted()
            } else {
                alertRef.current?.show('Error', 'No se pudo eliminar la unidad', 'error')
            }
        } catch (error) {
            alertRef.current?.show('Error', 'Error al eliminar unidad', 'error')
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
                    {unit ? (
                        <View>
                            <View className="flex gap-0 mb-8">
                                <View className="flex flex-row justify-between items-center">
                                    <Text className="text-foreground text-2xl font-medium">¿Eliminar unidad?</Text>
                                    <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                        <Ionicons name="close-outline" size={24} color={colors.foreground} />
                                    </Button>
                                </View>
                                <Text className="text-muted-foreground">
                                    ¿Está seguro que desea eliminar la unidad "{unit.name}"? Esta acción no se puede deshacer.
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
// PANTALLA PRINCIPAL - UNITS OF MEASUREMENT SCREEN
// =====================================================================
const UnitsOfMeasurementScreen = () => {
    const [isLoading, setIsLoading] = useState(true)
    const [units, setUnits] = useState([])
    const { colors } = useTheme()
    const [searchValue, setSearchValue] = useState('')
    const [sortOption, setSortOption] = useState({ value: 'name', label: 'Nombre' })
    const [rowsPerPage, setRowsPerPage] = useState('10')
    const [page, setPage] = useState(1)
    const filterModalRef = useRef(null)
    const createModalRef = useRef(null)
    const editModalRef = useRef(null)
    const deleteModalRef = useRef(null)
    const alertRef = useRef(null)
    const [unitToEdit, setUnitToEdit] = useState(null)
    const [unitToDelete, setUnitToDelete] = useState(null)

    const openFilterModal = () => filterModalRef.current?.open()
    const openCreateModal = () => {
        requestAnimationFrame(() => {
            createModalRef.current?.open()
        })
    }
    const openEditModal = (unit) => {
        setUnitToEdit(unit)
        setTimeout(() => {
            editModalRef.current?.open()
        }, 0)
    }
    const openDeleteModal = (unit) => {
        setUnitToDelete(unit)
        setTimeout(() => {
            deleteModalRef.current?.open()
        }, 0)
    }

    const fetchData = async () => {
        try {
            setIsLoading(true)
            const response = await getUnitsOfMeasurement()
            const list = Array.isArray(response?.data) ? response.data : []
            setUnits(list)
        } catch (err) {
            console.error('Error fetch:', err)
            alertRef.current?.show('Error', 'No se pudieron cargar las unidades', 'error')
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
        let result = [...units]
        if (searchValue) {
            const lowerSearch = searchValue.toLowerCase()
            result = result.filter(
                (unit) =>
                    unit.name?.toLowerCase().includes(lowerSearch) ||
                    unit.code?.toLowerCase().includes(lowerSearch) ||
                    unit.description?.toLowerCase().includes(lowerSearch),
            )
        }
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
    }, [units, searchValue, sortOption])

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
                                <Text className="font-bold text-[32px] text-foreground">Unidades</Text>
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
                            placeholder="Buscar por nombre, Código o descripción..."
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
                                                            <View className="flex-1 pr-2 justify-center py-1">
                                                                <Text className="text-foreground font-medium text-lg mb-1" numberOfLines={1}>
                                                                    {item.name}
                                                                </Text>
                                                                <Text className="text-muted-foreground text-[14px]" numberOfLines={1}>
                                                                    Código: {item.code || 'N/A'}
                                                                </Text>
                                                            </View>
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
                                                        <View className="h-px bg-border/30 mt-0 mb-3" />
                                                        <View className="gap-2">
                                                            {item.description && <InfoRow label="Descripción" value={item.description} />}
                                                            <InfoRow label="Código" value={item.code || 'N/A'} />
                                                            {item.conversionFactor && <InfoRow label="Factor Conv." value={item.conversionFactor.toString()} />}
                                                            <InfoRow label="Creado" value={item.createdAt ? formatDateLiteral(item.createdAt, true) : 'N/A'} />
                                                            <InfoRow
                                                                label="Actualizado"
                                                                value={item.updatedAt ? formatDateLiteral(item.updatedAt, true) : 'N/A'}
                                                            />
                                                        </View>
                                                    </Accordion.Content>
                                                </Accordion.Item>
                                            ))}
                                        </Accordion>
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
                                        <Ionicons name="scale-outline" size={64} color={colors.muted} />
                                        <Text className="text-muted-foreground text-lg mt-4">No se encontraron unidades</Text>
                                        <Text className="text-muted-foreground text-center mt-2 px-8">
                                            {searchValue ? 'Intente con otros términos de búsqueda' : 'Comience creando una nueva unidad de medida'}
                                        </Text>
                                    </View>
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
                rowsPerPage={rowsPerPage}
                setRowsPerPage={setRowsPerPage}
                setPage={setPage}
            />
            <CreateUnitModalContent modalRef={createModalRef} onUnitCreated={fetchData} isLoading={isLoading} alertRef={alertRef} />
            <EditUnitModalContent modalRef={editModalRef} unit={unitToEdit} onUnitUpdated={fetchData} alertRef={alertRef} />
            <DeleteUnitModalContent modalRef={deleteModalRef} unit={unitToDelete} onUnitDeleted={fetchData} alertRef={alertRef} />
            <CustomAlert ref={alertRef} />
        </View>
    )
}

export default UnitsOfMeasurementScreen
