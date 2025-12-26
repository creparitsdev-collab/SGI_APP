import React, { useEffect, useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react'
import { Text, View, TouchableOpacity, Platform, Dimensions } from 'react-native'
import ScrollableLayout from '../../layouts/ScrollableLayout'
import { Accordion, Button, RadioGroup, ScrollShadow, Spinner, Switch, TextField, useTheme } from 'heroui-native'
import { getUsersRequest, updateUser, changeStatus, createUser } from '../../services/user'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { formatDateLiteral } from '../../utils/utils'
import { Modalize } from 'react-native-modalize'
import { ScrollView } from 'react-native-gesture-handler'
import { required, onlyLetters, validEmail, validPhone, validRoleId } from '../../utils/validators'
import BackButton from '../../components/BackButton'

const { height } = Dimensions.get('window')
const MODAL_MAX_HEIGHT = height * 0.75
const OVERLAY_STYLE = { backgroundColor: 'rgba(0, 0, 0, 0.4)' } // Oscurecí un poco más el fondo (0.4) para mejor contraste

const InfoRow = ({ label, value, valueClassName = '' }) => (
    <View className="flex-row items-start justify-between">
        <Text className="text-[14px] text-muted-foreground w-24 pt-0.5">{label}</Text>
        <Text className={`text-[14px] text-right flex-1 font-medium ${valueClassName ? valueClassName : 'text-foreground'}`} numberOfLines={2}>
            {value}
        </Text>
    </View>
)

// NUEVA CONFIGURACIÓN DE ANIMACIÓN
const MODAL_ANIMATION_PROPS = {
    // Hace que la animación de entrada dure 450ms (se nota más y es suave)
    openAnimationConfig: {
        timing: { duration: 450 },
    },
    // Hace que la animación de salida sea un poco más rápida pero suave
    closeAnimationConfig: {
        timing: { duration: 300 },
    },
    // Hace que el gesto de arrastrar para cerrar sea más fluido
    dragToss: 0.05,
    threshold: 120,
    // Asegura que use el driver nativo para 60fps
    useNativeDriver: true,
    // Estilos base
    adjustToContentHeight: true,
    avoidKeyboardLikeIOS: true,
    overlayStyle: OVERLAY_STYLE,
    handlePosition: 'inside',
}
// =====================================================================
// CONSTANTES
// =====================================================================
const ROLE_OPTIONS = [
    { value: '1', label: 'Administrador' },
    { value: '2', label: 'Usuario' },
]

const getRoleLabel = (id) => {
    const role = ROLE_OPTIONS.find((r) => r.value == id)
    return role ? role.label : 'Seleccionar Rol'
}

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
        <Modalize
            ref={modalRef}
            {...MODAL_ANIMATION_PROPS} // <--- AQUI LA MAGIA
            modalStyle={{ backgroundColor: colors.background }}
        >
            <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{
                        paddingHorizontal: '6%',
                        paddingTop: '9%',
                        paddingBottom: '6%',
                    }}
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
// 1. MODAL DE FILTROS
// =====================================================================
const FiltersModalContent = ({ modalRef, sortOption, setSortOption, statusFilter, setStatusFilter, rowsPerPage, setRowsPerPage, setPage }) => {
    const { colors } = useTheme()

    const onClose = () => {
        modalRef.current?.close()
    }

    const sortOptions = [
        { label: 'Nombre', value: 'name' },
        { label: 'Correo', value: 'email' },
        { label: 'Puesto', value: 'position' },
        { label: 'Rol', value: 'role' },
    ]

    const statusOptions = [
        { label: 'Todos los estatus', value: 'all' },
        { label: 'Activo', value: 'activo' },
        { label: 'Inactivo', value: 'inactivo' },
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

    const handleStatusChange = (val) => {
        setStatusFilter(val)
    }

    const handleRowsChange = (val) => {
        setRowsPerPage(val)
        setPage(1)
    }

    return (
        <Modalize
            ref={modalRef}
            {...MODAL_ANIMATION_PROPS} // <--- AQUI LA MAGIA
            modalStyle={{ backgroundColor: colors.background }}
        >
            <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: '6%',
                        paddingTop: '9%',
                        paddingBottom: '6%',
                    }}
                >
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

                        {/* FILTRAR POR ESTADO */}
                        <View>
                            <View className="mb-0">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Filtrar por estado</Text>
                            </View>
                            <RadioGroup value={statusFilter} onValueChange={handleStatusChange}>
                                {statusOptions.map((opt) => (
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
                            <RadioGroup value={rowsPerPage} onValueChange={handleRowsChange}>
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
// 2. MODAL DE EDICIÓN (CON VALIDACIÓN)
// =====================================================================
const EditUserModalContent = ({ modalRef, user, onUserUpdated, alertRef }) => {
    const { colors } = useTheme()
    const roleModalRef = useRef(null)
    const [isSaving, setIsSaving] = useState(false)
    const [editedUser, setEditedUser] = useState({ name: '', email: '', position: '', phone: '', roleId: 1 })
    const [userErrors, setUserErrors] = useState({
        name: [],
        email: [],
        position: [],
        phone: [],
        roleId: [],
    })

    // Definir validadores
    const validators = {
        name: [required, onlyLetters],
        email: [required, validEmail],
        position: [required, onlyLetters],
        phone: [validPhone],
        roleId: [validRoleId],
    }

    // Función para ejecutar validadores
    const runValidators = (value, fns) => fns.map((fn) => fn(value)).filter(Boolean)

    // Handler para cambios en inputs con validación en tiempo real
    const handleInputChange = (field, value) => {
        setEditedUser((prev) => ({ ...prev, [field]: value }))
        const fns = validators[field] || []
        const errs = runValidators(value, fns)
        setUserErrors((prev) => ({ ...prev, [field]: errs }))
    }

    useEffect(() => {
        if (user) {
            setEditedUser({ ...user })

            // Limpia errores inmediatamente para que no parpadeen los rojos viejos
            setUserErrors({
                name: [],
                email: [],
                position: [],
                phone: [],
                roleId: [],
            })
        }
    }, [user])

    const onClose = () => {
        modalRef.current?.close()
    }

    const handleSave = async () => {
        // Validación final antes de guardar
        const nameErrs = runValidators(editedUser.name, validators.name)
        const emailErrs = runValidators(editedUser.email, validators.email)
        const positionErrs = runValidators(editedUser.position, validators.position)
        const phoneErrs = runValidators(editedUser.phone, validators.phone)
        const roleIdErrs = runValidators(String(editedUser.roleId), validators.roleId)

        if (nameErrs.length > 0 || emailErrs.length > 0 || positionErrs.length > 0 || phoneErrs.length > 0 || roleIdErrs.length > 0) {
            setUserErrors({
                name: nameErrs,
                email: emailErrs,
                position: positionErrs,
                phone: phoneErrs,
                roleId: roleIdErrs,
            })
            alertRef.current?.show('Atención', 'Por favor corrija los errores en el formulario.', 'warning')
            return
        }

        try {
            setIsSaving(true)

            // Validación del servidor: verificar email duplicado
            const response = await getUsersRequest()
            const users = response.data || []
            const exists = users.find((u) => u.email.trim().toLowerCase() === editedUser.email.trim().toLowerCase() && u.id !== editedUser.id)

            if (exists) {
                setUserErrors((prev) => ({
                    ...prev,
                    email: ['El correo electrónico ingresado ya está en uso.'],
                }))
                alertRef.current?.show('Error', 'El correo electrónico ingresado ya está en uso.', 'error')
                return
            }

            const userToUpdate = {
                id: editedUser.id,
                name: editedUser.name.trim(),
                email: editedUser.email.trim(),
                position: editedUser.position.trim(),
                phone: editedUser.phone?.trim() || '',
                roleId: editedUser.roleId,
            }

            const updateResponse = await updateUser(userToUpdate)

            if (updateResponse.type === 'SUCCESS') {
                onClose()
                setTimeout(() => {
                    alertRef.current?.show('Éxito', `Usuario ${editedUser.name} actualizado correctamente`, 'success')
                }, 300)
                if (onUserUpdated) onUserUpdated()
            } else {
                alertRef.current?.show('Error', 'No se pudo actualizar el usuario', 'error')
            }
        } catch (error) {
            console.error('Error update:', error)
            if (error.response?.data) {
                const { result, title } = error.response.data
                alertRef.current?.show('Error', title || 'Error al actualizar', 'error')

                // Procesar errores específicos de campo si existen
                if (result && Array.isArray(result) && result.length > 0) {
                    const newFieldErrors = { name: [], email: [], position: [], phone: [], roleId: [] }
                    result.forEach((validationError) => {
                        const field = validationError.field
                        const descriptions = validationError.descriptions || []
                        if (newFieldErrors.hasOwnProperty(field)) {
                            newFieldErrors[field] = descriptions
                        }
                    })
                    setUserErrors(newFieldErrors)
                }
            } else {
                alertRef.current?.show('Error', 'Error al actualizar', 'error')
            }
        } finally {
            setIsSaving(false)
        }
    }

    const openRoles = () => roleModalRef.current?.open()

    const selectRole = (val) => {
        handleInputChange('roleId', Number(val))
    }

    // Verificar si hay errores en el formulario
    const hasErrors = () => {
        return (
            userErrors.name.length > 0 ||
            userErrors.email.length > 0 ||
            userErrors.position.length > 0 ||
            userErrors.phone.length > 0 ||
            userErrors.roleId.length > 0 ||
            !editedUser.name.trim() ||
            !editedUser.email.trim() ||
            !editedUser.position.trim()
        )
    }

    return (
        <>
            <Modalize
                ref={modalRef}
                {...MODAL_ANIMATION_PROPS} // <--- AQUI LA MAGIA
                modalStyle={{ backgroundColor: colors.background }}
            >
                <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{
                            paddingHorizontal: '6%',
                            paddingTop: '9%',
                            paddingBottom: '6%',
                        }}
                    >
                        {user ? (
                            <>
                                <View className="flex gap-0 mb-8">
                                    <View className="flex flex-row justify-between items-center">
                                        <Text className="text-foreground text-2xl font-medium">Editar usuario</Text>
                                        <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                            <Ionicons name="close-outline" size={24} color={colors.foreground} />
                                        </Button>
                                    </View>
                                    <Text className="text-muted-foreground">Edite los datos del usuario</Text>
                                </View>
                                <View className="gap-6">
                                    <TextField isRequired isInvalid={userErrors.name.length > 0}>
                                        <View className="flex-row justify-between items-center mb-2">
                                            <TextField.Label className="text-foreground font-medium">Nombre</TextField.Label>
                                            <Text className="text-muted-foreground text-xs">{editedUser.name.length} / 50</Text>
                                        </View>
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: userErrors.name.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: userErrors.name.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="Nombre del usuario"
                                            value={editedUser.name}
                                            onChangeText={(text) => handleInputChange('name', text)}
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                            maxLength={50}
                                        >
                                            <TextField.InputEndContent>
                                                {userErrors.name.length === 0 && editedUser.name.trim() ? (
                                                    <Ionicons name="checkmark" size={24} color={colors.accent} />
                                                ) : userErrors.name.length > 0 ? (
                                                    <Ionicons name="close" size={24} color={colors.danger} />
                                                ) : null}
                                            </TextField.InputEndContent>
                                        </TextField.Input>
                                        {userErrors.name.length > 0 ? <TextField.ErrorMessage>{userErrors.name.join('\n')}</TextField.ErrorMessage> : undefined}
                                    </TextField>

                                    <TextField isRequired isInvalid={userErrors.email.length > 0}>
                                        <View className="flex-row justify-between items-center mb-2">
                                            <TextField.Label className="text-foreground font-medium">Correo electrónico</TextField.Label>
                                            <Text className="text-muted-foreground text-xs">{editedUser.email.length} / 50</Text>
                                        </View>
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: userErrors.email.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: userErrors.email.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="correo@ejemplo.com"
                                            value={editedUser.email}
                                            onChangeText={(text) => handleInputChange('email', text)}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                            maxLength={50}
                                        >
                                            <TextField.InputEndContent>
                                                {userErrors.email.length === 0 && editedUser.email.trim() ? (
                                                    <Ionicons name="checkmark" size={24} color={colors.accent} />
                                                ) : userErrors.email.length > 0 ? (
                                                    <Ionicons name="close" size={24} color={colors.danger} />
                                                ) : null}
                                            </TextField.InputEndContent>
                                        </TextField.Input>
                                        {userErrors.email.length > 0 ? (
                                            <TextField.ErrorMessage>{userErrors.email.join('\n')}</TextField.ErrorMessage>
                                        ) : undefined}
                                    </TextField>

                                    <TextField isRequired isInvalid={userErrors.position.length > 0}>
                                        <View className="flex-row justify-between items-center mb-2">
                                            <TextField.Label className="text-foreground font-medium">Puesto</TextField.Label>
                                            <Text className="text-muted-foreground text-xs">{editedUser.position.length} / 50</Text>
                                        </View>
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: userErrors.position.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: userErrors.position.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="Puesto del usuario"
                                            value={editedUser.position}
                                            onChangeText={(text) => handleInputChange('position', text)}
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                            maxLength={50}
                                        >
                                            <TextField.InputEndContent>
                                                {userErrors.position.length === 0 && editedUser.position.trim() ? (
                                                    <Ionicons name="checkmark" size={24} color={colors.accent} />
                                                ) : userErrors.position.length > 0 ? (
                                                    <Ionicons name="close" size={24} color={colors.danger} />
                                                ) : null}
                                            </TextField.InputEndContent>
                                        </TextField.Input>
                                        {userErrors.position.length > 0 ? (
                                            <TextField.ErrorMessage>{userErrors.position.join('\n')}</TextField.ErrorMessage>
                                        ) : undefined}
                                    </TextField>

                                    <View style={{ zIndex: 1000 }}>
                                        <Text className="text-foreground font-medium mb-2">
                                            Rol <Text className="text-danger">*</Text>
                                        </Text>
                                        <TouchableOpacity onPress={openRoles}>
                                            <View className="w-full h-12 flex-row items-center justify-between px-4 rounded-lg bg-accent-soft">
                                                <Text className="text-foreground font-medium">{getRoleLabel(editedUser.roleId)}</Text>
                                                <Ionicons name="chevron-down-outline" size={24} color={colors.accent} />
                                            </View>
                                        </TouchableOpacity>
                                        {userErrors.roleId.length > 0 ? <Text className="text-danger text-sm mt-1">{userErrors.roleId.join('\n')}</Text> : null}
                                    </View>

                                    <TextField isInvalid={userErrors.phone.length > 0}>
                                        <View className="flex-row justify-between items-center mb-2">
                                            <TextField.Label className="text-foreground font-medium">Teléfono</TextField.Label>
                                            <Text className="text-muted-foreground text-xs">{editedUser.phone?.length || 0} / 10</Text>
                                        </View>
                                        <TextField.Input
                                            colors={{
                                                blurBackground: colors.accentSoft,
                                                focusBackground: colors.surface2,
                                                blurBorder: userErrors.phone.length > 0 ? colors.danger : colors.accentSoft,
                                                focusBorder: userErrors.phone.length > 0 ? colors.danger : colors.surface2,
                                            }}
                                            placeholder="Teléfono (Opcional)"
                                            value={editedUser.phone || ''}
                                            onChangeText={(text) => handleInputChange('phone', text)}
                                            keyboardType="phone-pad"
                                            cursorColor={colors.accent}
                                            selectionHandleColor={colors.accent}
                                            selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                            maxLength={10}
                                        >
                                            <TextField.InputEndContent>
                                                {userErrors.phone.length === 0 && editedUser.phone?.trim() && editedUser.phone.length === 10 ? (
                                                    <Ionicons name="checkmark" size={24} color={colors.accent} />
                                                ) : userErrors.phone.length > 0 ? (
                                                    <Ionicons name="close" size={24} color={colors.danger} />
                                                ) : null}
                                            </TextField.InputEndContent>
                                        </TextField.Input>
                                        {userErrors.phone.length > 0 ? (
                                            <TextField.ErrorMessage>{userErrors.phone.join('\n')}</TextField.ErrorMessage>
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

            <Modalize
                ref={roleModalRef}
                {...MODAL_ANIMATION_PROPS} // <--- AQUI LA MAGIA
                modalStyle={{ backgroundColor: colors.background }}
            >
                <View className="px-[6%] pt-[9%] pb-[6%]" style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <View className="flex gap-0 mb-8">
                        <View className="flex flex-row justify-between items-center">
                            <Text className="text-foreground text-2xl font-medium">Seleccionar rol</Text>
                            <Button isIconOnly className="bg-transparent shrink-0" onPress={() => roleModalRef.current?.close()}>
                                <Ionicons name="close-outline" size={24} color={colors.foreground} />
                            </Button>
                        </View>
                        <Text className="text-muted-foreground">Seleccione el rol nuevo que se asignará al usuario</Text>
                    </View>
                    <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
                        <View>
                            <View className="mb-0">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Roles disponibles</Text>
                            </View>
                            <RadioGroup value={String(editedUser.roleId)} onValueChange={(val) => selectRole(val)}>
                                {ROLE_OPTIONS.map((role) => (
                                    <RadioGroup.Item
                                        key={role.value}
                                        value={role.value}
                                        className="-my-0.5 flex-row items-center p-4 bg-accent-soft rounded-lg border-0"
                                    >
                                        <View className="flex-1">
                                            <RadioGroup.Title className="text-foreground font-medium text-lg">{role.label}</RadioGroup.Title>
                                        </View>
                                        <RadioGroup.Indicator />
                                    </RadioGroup.Item>
                                ))}
                            </RadioGroup>
                        </View>
                    </ScrollView>
                </View>
            </Modalize>
        </>
    )
}

// =====================================================================
// 3. MODAL DE CREACIÓN (CON VALIDACIÓN)
// =====================================================================
const CreateUserModalContent = ({ modalRef, onUserCreated, isLoading, alertRef }) => {
    const { colors } = useTheme()
    const roleModalRef = useRef(null)
    const [isSaving, setIsSaving] = useState(false)
    const [newUser, setNewUser] = useState({ name: '', email: '', position: '', phone: '', roleId: 1 })
    const [userErrors, setUserErrors] = useState({
        name: [],
        email: [],
        position: [],
        phone: [],
        roleId: [],
    })

    // Definir validadores
    const validators = {
        name: [required, onlyLetters],
        email: [required, validEmail],
        position: [required, onlyLetters],
        phone: [validPhone],
        roleId: [validRoleId],
    }

    // Función para ejecutar validadores
    const runValidators = (value, fns) => fns.map((fn) => fn(value)).filter(Boolean)

    // Handler para cambios en inputs con validación en tiempo real
    const handleInputChange = (field, value) => {
        setNewUser((prev) => ({ ...prev, [field]: value }))
        const fns = validators[field] || []
        const errs = runValidators(value, fns)
        setUserErrors((prev) => ({ ...prev, [field]: errs }))
    }

    const onClose = () => {
        modalRef.current?.close()
        // Resetear formulario al cerrar
        setNewUser({ name: '', email: '', position: '', phone: '', roleId: 1 })
        setUserErrors({
            name: [],
            email: [],
            position: [],
            phone: [],
            roleId: [],
        })
    }

    const openRoles = () => roleModalRef.current?.open()

    const selectRole = (val) => {
        handleInputChange('roleId', Number(val))
    }

    const handleCreate = async () => {
        // Validación final antes de crear
        const nameErrs = runValidators(newUser.name, validators.name)
        const emailErrs = runValidators(newUser.email, validators.email)
        const positionErrs = runValidators(newUser.position, validators.position)
        const phoneErrs = runValidators(newUser.phone, validators.phone)
        const roleIdErrs = runValidators(String(newUser.roleId), validators.roleId)

        if (nameErrs.length > 0 || emailErrs.length > 0 || positionErrs.length > 0 || phoneErrs.length > 0 || roleIdErrs.length > 0) {
            setUserErrors({
                name: nameErrs,
                email: emailErrs,
                position: positionErrs,
                phone: phoneErrs,
                roleId: roleIdErrs,
            })
            alertRef.current?.show('Atención', 'Por favor corrija los errores en el formulario.', 'warning')
            return
        }

        try {
            setIsSaving(true)

            // Validación del servidor: verificar email duplicado
            const response = await getUsersRequest()
            const users = response.data || []
            const exists = users.find((u) => u.email.trim().toLowerCase() === newUser.email.trim().toLowerCase())

            if (exists) {
                setUserErrors((prev) => ({
                    ...prev,
                    email: ['El correo electrónico ingresado ya está en uso.'],
                }))
                alertRef.current?.show('Error', 'El correo electrónico ingresado ya está en uso.', 'error')
                return
            }

            await createUser(newUser)
            onClose()
            setTimeout(() => {
                alertRef.current?.show('Éxito', 'Agregado con éxito, su contraseña es Admin2024#Secure', 'success')
            }, 300)
            if (onUserCreated) onUserCreated()
        } catch (error) {
            console.error('Error create:', error)
            if (error.response?.data) {
                const { result, title } = error.response.data
                alertRef.current?.show('Error', title || 'Error al crear usuario', 'error')

                // Procesar errores específicos de campo si existen
                if (result && Array.isArray(result) && result.length > 0) {
                    const newFieldErrors = { name: [], email: [], position: [], phone: [], roleId: [] }
                    result.forEach((validationError) => {
                        const field = validationError.field
                        const descriptions = validationError.descriptions || []
                        if (newFieldErrors.hasOwnProperty(field)) {
                            newFieldErrors[field] = descriptions
                        }
                    })
                    setUserErrors(newFieldErrors)
                }
            } else {
                alertRef.current?.show('Error', 'No se pudo crear el usuario', 'error')
            }
        } finally {
            setIsSaving(false)
        }
    }

    // Verificar si hay errores en el formulario
    const hasErrors = () => {
        return (
            userErrors.name.length > 0 ||
            userErrors.email.length > 0 ||
            userErrors.position.length > 0 ||
            userErrors.phone.length > 0 ||
            userErrors.roleId.length > 0 ||
            !newUser.name.trim() ||
            !newUser.email.trim() ||
            !newUser.position.trim()
        )
    }

    return (
        <>
            <Modalize
                ref={modalRef}
                {...MODAL_ANIMATION_PROPS} // <--- AQUI LA MAGIA
                modalStyle={{ backgroundColor: colors.background }}
            >
                <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{
                            paddingHorizontal: '6%',
                            paddingTop: '9%',
                            paddingBottom: '6%',
                        }}
                    >
                        <View className="flex gap-0 mb-8">
                            <View className="flex flex-row justify-between items-center">
                                <Text className="text-foreground text-2xl font-medium">Registrar usuario</Text>
                                <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                    <Ionicons name="close-outline" size={24} color={colors.foreground} />
                                </Button>
                            </View>
                            <Text className="text-muted-foreground">Ingrese los datos del nuevo usuario</Text>
                        </View>
                        <View className="gap-6">
                            <TextField isRequired isInvalid={userErrors.name.length > 0}>
                                <View className="flex-row justify-between items-center mb-2">
                                    <TextField.Label className="text-foreground font-medium">Nombre</TextField.Label>
                                    <Text className="text-muted-foreground text-xs">{newUser.name.length} / 50</Text>
                                </View>
                                <TextField.Input
                                    colors={{
                                        blurBackground: colors.accentSoft,
                                        focusBackground: colors.surface2,
                                        blurBorder: userErrors.name.length > 0 ? colors.danger : colors.accentSoft,
                                        focusBorder: userErrors.name.length > 0 ? colors.danger : colors.surface2,
                                    }}
                                    placeholder="Nombre del usuario"
                                    value={newUser.name}
                                    onChangeText={(text) => handleInputChange('name', text)}
                                    cursorColor={colors.accent}
                                    selectionHandleColor={colors.accent}
                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                    maxLength={50}
                                >
                                    <TextField.InputEndContent>
                                        {userErrors.name.length === 0 && newUser.name.trim() ? (
                                            <Ionicons name="checkmark" size={24} color={colors.accent} />
                                        ) : userErrors.name.length > 0 ? (
                                            <Ionicons name="close" size={24} color={colors.danger} />
                                        ) : null}
                                    </TextField.InputEndContent>
                                </TextField.Input>
                                {userErrors.name.length > 0 ? <TextField.ErrorMessage>{userErrors.name.join('\n')}</TextField.ErrorMessage> : undefined}
                            </TextField>

                            <TextField isRequired isInvalid={userErrors.email.length > 0}>
                                <View className="flex-row justify-between items-center mb-2">
                                    <TextField.Label className="text-foreground font-medium">Correo electrónico</TextField.Label>
                                    <Text className="text-muted-foreground text-xs">{newUser.email.length} / 50</Text>
                                </View>
                                <TextField.Input
                                    colors={{
                                        blurBackground: colors.accentSoft,
                                        focusBackground: colors.surface2,
                                        blurBorder: userErrors.email.length > 0 ? colors.danger : colors.accentSoft,
                                        focusBorder: userErrors.email.length > 0 ? colors.danger : colors.surface2,
                                    }}
                                    placeholder="correo@ejemplo.com"
                                    value={newUser.email}
                                    onChangeText={(text) => handleInputChange('email', text)}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    cursorColor={colors.accent}
                                    selectionHandleColor={colors.accent}
                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                    maxLength={50}
                                >
                                    <TextField.InputEndContent>
                                        {userErrors.email.length === 0 && newUser.email.trim() ? (
                                            <Ionicons name="checkmark" size={24} color={colors.accent} />
                                        ) : userErrors.email.length > 0 ? (
                                            <Ionicons name="close" size={24} color={colors.danger} />
                                        ) : null}
                                    </TextField.InputEndContent>
                                </TextField.Input>
                                {userErrors.email.length > 0 ? <TextField.ErrorMessage>{userErrors.email.join('\n')}</TextField.ErrorMessage> : undefined}
                            </TextField>

                            <TextField isRequired isInvalid={userErrors.position.length > 0}>
                                <View className="flex-row justify-between items-center mb-2">
                                    <TextField.Label className="text-foreground font-medium">Puesto</TextField.Label>
                                    <Text className="text-muted-foreground text-xs">{newUser.position.length} / 50</Text>
                                </View>
                                <TextField.Input
                                    colors={{
                                        blurBackground: colors.accentSoft,
                                        focusBackground: colors.surface2,
                                        blurBorder: userErrors.position.length > 0 ? colors.danger : colors.accentSoft,
                                        focusBorder: userErrors.position.length > 0 ? colors.danger : colors.surface2,
                                    }}
                                    placeholder="Puesto del usuario"
                                    value={newUser.position}
                                    onChangeText={(text) => handleInputChange('position', text)}
                                    cursorColor={colors.accent}
                                    selectionHandleColor={colors.accent}
                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                    maxLength={50}
                                >
                                    <TextField.InputEndContent>
                                        {userErrors.position.length === 0 && newUser.position.trim() ? (
                                            <Ionicons name="checkmark" size={24} color={colors.accent} />
                                        ) : userErrors.position.length > 0 ? (
                                            <Ionicons name="close" size={24} color={colors.danger} />
                                        ) : null}
                                    </TextField.InputEndContent>
                                </TextField.Input>
                                {userErrors.position.length > 0 ? <TextField.ErrorMessage>{userErrors.position.join('\n')}</TextField.ErrorMessage> : undefined}
                            </TextField>

                            <View style={{ zIndex: 1000 }}>
                                <Text className="text-foreground font-medium mb-2">
                                    Rol <Text className="text-danger">*</Text>
                                </Text>
                                <TouchableOpacity onPress={openRoles}>
                                    <View className="w-full h-12 flex-row items-center justify-between px-4 rounded-lg bg-accent-soft">
                                        <Text className="text-foreground font-medium">{getRoleLabel(newUser.roleId)}</Text>
                                        <Ionicons name="chevron-down-outline" size={24} color={colors.accent} />
                                    </View>
                                </TouchableOpacity>
                                {userErrors.roleId.length > 0 ? <Text className="text-danger text-sm mt-1">{userErrors.roleId.join('\n')}</Text> : null}
                            </View>

                            <TextField isInvalid={userErrors.phone.length > 0}>
                                <View className="flex-row justify-between items-center mb-2">
                                    <TextField.Label className="text-foreground font-medium">Teléfono</TextField.Label>
                                    <Text className="text-muted-foreground text-xs">{newUser.phone?.length || 0} / 10</Text>
                                </View>
                                <TextField.Input
                                    colors={{
                                        blurBackground: colors.accentSoft,
                                        focusBackground: colors.surface2,
                                        blurBorder: userErrors.phone.length > 0 ? colors.danger : colors.accentSoft,
                                        focusBorder: userErrors.phone.length > 0 ? colors.danger : colors.surface2,
                                    }}
                                    placeholder="Teléfono (Opcional)"
                                    value={newUser.phone || ''}
                                    onChangeText={(text) => handleInputChange('phone', text)}
                                    keyboardType="phone-pad"
                                    cursorColor={colors.accent}
                                    selectionHandleColor={colors.accent}
                                    selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                    maxLength={10}
                                >
                                    <TextField.InputEndContent>
                                        {userErrors.phone.length === 0 && newUser.phone?.trim() && newUser.phone.length === 10 ? (
                                            <Ionicons name="checkmark" size={24} color={colors.accent} />
                                        ) : userErrors.phone.length > 0 ? (
                                            <Ionicons name="close" size={24} color={colors.danger} />
                                        ) : null}
                                    </TextField.InputEndContent>
                                </TextField.Input>
                                {userErrors.phone.length > 0 ? <TextField.ErrorMessage>{userErrors.phone.join('\n')}</TextField.ErrorMessage> : undefined}
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

            <Modalize
                ref={roleModalRef}
                {...MODAL_ANIMATION_PROPS} // <--- AQUI LA MAGIA
                modalStyle={{ backgroundColor: colors.background }}
            >
                <View className="px-[6%] pt-[9%] pb-[6%]" style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                    <View className="flex gap-0 mb-8">
                        <View className="flex flex-row justify-between items-center">
                            <Text className="text-foreground text-2xl font-medium">Seleccionar rol</Text>
                            <Button isIconOnly className="bg-transparent shrink-0" onPress={() => roleModalRef.current?.close()}>
                                <Ionicons name="close-outline" size={24} color={colors.foreground} />
                            </Button>
                        </View>
                        <Text className="text-muted-foreground">Seleccione el rol que se asignará al nuevo usuario</Text>
                    </View>
                    <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
                        <View>
                            <View className="mb-0">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Roles disponibles</Text>
                            </View>
                            <RadioGroup value={String(newUser.roleId)} onValueChange={(val) => selectRole(val)}>
                                {ROLE_OPTIONS.map((role) => (
                                    <RadioGroup.Item
                                        key={role.value}
                                        value={role.value}
                                        className="-my-0.5 flex-row items-center p-4 bg-accent-soft rounded-lg border-0"
                                    >
                                        <View className="flex-1">
                                            <RadioGroup.Title className="text-foreground font-medium text-lg">{role.label}</RadioGroup.Title>
                                        </View>
                                        <RadioGroup.Indicator />
                                    </RadioGroup.Item>
                                ))}
                            </RadioGroup>
                        </View>
                    </ScrollView>
                </View>
            </Modalize>
        </>
    )
}

// =====================================================================
// 4. MODAL DE STATUS
// =====================================================================
const StatusChangeModalContent = ({ modalRef, user, onStatusChanged, alertRef }) => {
    const { colors } = useTheme()
    const [isChangingStatus, setIsChangingStatus] = useState(false)

    const onClose = () => modalRef.current?.close()

    const handleChangeStatus = async () => {
        try {
            setIsChangingStatus(true)
            const response = await changeStatus(user.email)
            if (response.type === 'SUCCESS') {
                onClose()
                setTimeout(() => {
                    alertRef.current?.show('Éxito', 'Estado actualizado correctamente', 'success')
                }, 300)
                if (onStatusChanged) onStatusChanged()
            } else {
                alertRef.current?.show('Error', 'No se pudo cambiar el estado', 'error')
            }
        } catch (error) {
            alertRef.current?.show('Error', 'Error al cambiar estado', 'error')
        } finally {
            setIsChangingStatus(false)
        }
    }

    return (
        <Modalize
            ref={modalRef}
            {...MODAL_ANIMATION_PROPS} // <--- AQUI LA MAGIA
            modalStyle={{ backgroundColor: colors.background }}
        >
            <View style={{ maxHeight: MODAL_MAX_HEIGHT }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{
                        paddingHorizontal: '6%',
                        paddingTop: '9%',
                        paddingBottom: '6%',
                    }}
                >
                    {user ? (
                        <View>
                            <View className="flex gap-0 mb-8">
                                <View className="flex flex-row justify-between items-center">
                                    <Text className="text-foreground text-2xl font-medium">
                                        {user.status === 'activo' ? '¿Inhabilitar usuario?' : '¿Habilitar usuario?'}
                                    </Text>
                                    <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                        <Ionicons name="close-outline" size={24} color={colors.foreground} />
                                    </Button>
                                </View>
                                <Text className="text-muted-foreground">
                                    {user.status === 'activo'
                                        ? `¿Está seguro que desea inhabilitar a ${user.name}? El usuario no podrá acceder al sistema.`
                                        : `¿Está seguro que desea habilitar a ${user.name}? El usuario podrá acceder al sistema nuevamente.`}
                                </Text>
                            </View>
                            <View className="flex-row justify-end gap-3">
                                <Button className="flex-1" variant="primary" onPress={handleChangeStatus} isDisabled={isChangingStatus}>
                                    {isChangingStatus ? (
                                        <>
                                            <Spinner color={colors.accentForeground} size="md" />
                                            <Button.Label>{user.status === 'activo' ? 'Inhabilitando' : 'Habilitando'}...</Button.Label>
                                        </>
                                    ) : (
                                        <>
                                            <Ionicons
                                                name={user.status === 'activo' ? 'remove-outline' : 'checkmark-outline'}
                                                size={24}
                                                color={colors.accentForeground}
                                            />
                                            <Button.Label>{user.status === 'activo' ? 'Inhabilitar' : 'Habilitar'}</Button.Label>
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
// PANTALLA PRINCIPAL
// =====================================================================
const UsersScreen = () => {
    const [isLoading, setIsLoading] = useState(true)
    const [users, setUsers] = useState([])
    const { colors } = useTheme()
    // Estados de filtros
    const [searchValue, setSearchValue] = useState('')
    const [sortOption, setSortOption] = useState({ value: 'name', label: 'Nombre' })
    const [statusFilter, setStatusFilter] = useState('all')
    const [rowsPerPage, setRowsPerPage] = useState('10')
    const [page, setPage] = useState(1)

    // Controlamos el acordeón
    const [expandedKeys, setExpandedKeys] = useState(undefined)

    // Referencias y estados para Modales Globales
    const filterModalRef = useRef(null)
    const createModalRef = useRef(null)
    const editModalRef = useRef(null)
    const statusModalRef = useRef(null)
    const alertRef = useRef(null)

    const [userToEdit, setUserToEdit] = useState(null)
    const [userToChangeStatus, setUserToChangeStatus] = useState(null)

    // Handlers para abrir modales
    const openFilterModal = () => filterModalRef.current?.open()
    const openCreateModal = () => {
        // Incluso si no hay datos, damos tiempo al UI thread para prepararse
        requestAnimationFrame(() => {
            createModalRef.current?.open()
        })
    }
    const openEditModal = (user) => {
        setUserToEdit(user) // 1. React procesa los datos y renderiza el form oculto

        // 2. Esperamos un poco (100ms es imperceptible para el usuario pero oro para el CPU)
        setTimeout(() => {
            editModalRef.current?.open() // 3. Iniciamos la animación suavemente
        }, 0)
    }
    const openStatusModal = (user) => {
        setUserToChangeStatus(user)
        setTimeout(() => {
            statusModalRef.current?.open()
        }, 0)
    }

    const fetchData = async () => {
        try {
            setIsLoading(true)
            const response = await getUsersRequest()
            if (response?.data) {
                const dataCount = response.data.map((item) => ({
                    ...item,
                    role: item.roleId === 1 ? 'Administrador' : item.roleId === 2 ? 'Supervisor' : 'Operador',
                    status: item.status ? 'activo' : 'inactivo',
                }))
                setUsers(dataCount)
            }
        } catch (err) {
            console.error('Error fetch:', err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        setPage(1)
    }, [searchValue, statusFilter, rowsPerPage])

    const filteredAndSortedItems = useMemo(() => {
        let result = [...users]
        if (searchValue) {
            const lowerSearch = searchValue.toLowerCase()
            result = result.filter((user) => user.name.toLowerCase().includes(lowerSearch) || user.email.toLowerCase().includes(lowerSearch))
        }
        if (statusFilter && statusFilter !== 'all') {
            result = result.filter((user) => user.status === statusFilter)
        }
        if (sortOption?.value) {
            const key = sortOption.value
            const keyString = (user) => (user[key] || '').toString().toLowerCase()
            result.sort((a, b) => keyString(a).localeCompare(keyString(b)))
        }
        return result
    }, [users, searchValue, statusFilter, sortOption])

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
                                <Text className="font-bold text-[32px] text-foreground">Usuarios</Text>
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
                            {statusFilter !== 'all' && (
                                <View className="flex-row items-center bg-surface-1 px-2 py-2 rounded-lg gap-2">
                                    <Ionicons
                                        name={statusFilter === 'activo' ? 'person' : 'person-outline'}
                                        size={12}
                                        color={statusFilter === 'activo' ? colors.accent : colors.mutedForeground}
                                    />
                                    <Text className="text-xs font-semibold text-foreground capitalize">{statusFilter}</Text>
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
                            placeholder="Buscar..."
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
                                        <Accordion
                                            selectionMode="single"
                                            className="border-0"
                                            isDividerVisible={false}
                                            //value={expandedKeys}
                                            //onValueChange={setExpandedKeys}
                                        >
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
                                                                <Text className="text-muted-foreground text-[14px]" numberOfLines={1}>
                                                                    {item.email}
                                                                </Text>
                                                            </View>

                                                            {/* ACCIONES */}
                                                            <View className="flex flex-row items-center gap-0">
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
                                                            <InfoRow label="Puesto" value={item.position} />
                                                            <InfoRow label="Rol" value={item.role} />
                                                            <InfoRow
                                                                label="Teléfono"
                                                                value={item.phone || 'No especificado'}
                                                                valueClassName={item.phone ? '' : 'text-muted-foreground italic'}
                                                            />
                                                            <InfoRow label="Estado" value={item.status} />
                                                            <InfoRow label="Actualizado" value={formatDateLiteral(item.updatedAt, true)} />
                                                        </View>

                                                        {/* Switch de estado */}
                                                        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-border/30">
                                                            <Text className="text-[14px] text-muted-foreground">Cambiar estado</Text>
                                                            <TouchableOpacity onPress={() => openStatusModal(item)} activeOpacity={0.8}>
                                                                <View pointerEvents="none">
                                                                    <Switch
                                                                        isSelected={item.status === 'activo'}
                                                                        colors={{
                                                                            defaultBackground: colors.surface3,
                                                                            selectedBackground: colors.accent,
                                                                            defaultBorder: 'transparent',
                                                                            selectedBorder: 'transparent',
                                                                        }}
                                                                    >
                                                                        <Switch.Thumb
                                                                            colors={{
                                                                                defaultBackground: colors.background,
                                                                                selectedBackground: colors.accentForeground,
                                                                            }}
                                                                        />
                                                                    </Switch>
                                                                </View>
                                                            </TouchableOpacity>
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
                                    <Text className="text-center mt-4 text-muted-foreground">No se encontraron usuarios.</Text>
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
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                rowsPerPage={rowsPerPage}
                setRowsPerPage={setRowsPerPage}
                setPage={setPage}
            />
            <CreateUserModalContent modalRef={createModalRef} onUserCreated={fetchData} isLoading={isLoading} alertRef={alertRef} />
            <EditUserModalContent modalRef={editModalRef} user={userToEdit} onUserUpdated={fetchData} alertRef={alertRef} />
            <StatusChangeModalContent modalRef={statusModalRef} user={userToChangeStatus} onStatusChanged={fetchData} alertRef={alertRef} />
            <CustomAlert ref={alertRef} />
        </View>
    )
}
export default UsersScreen
