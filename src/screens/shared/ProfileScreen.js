import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { Text, View, TouchableOpacity, Platform, Dimensions } from 'react-native'
import ScrollableLayout from '../../layouts/ScrollableLayout'
import { Button, Spinner, TextField, useTheme } from 'heroui-native'
import { getUserProfile, updateUserProfile, changePassword, getProfile, updateProfile } from '../../services/user'
import { Ionicons } from '@expo/vector-icons'
import { Modalize } from 'react-native-modalize'
import { ScrollView } from 'react-native-gesture-handler'
import { required, onlyLetters, validEmail, validPhone, minLength } from '../../utils/validators'
import { useAuth } from '../../contexts/AuthContext'
import { LinearGradient } from 'expo-linear-gradient'
import ThemeSwitcher from '../../components/ThemeSwitcher'
import { getMyNotices } from '../../services/notice'
import { formatDateLiteral } from '../../utils/utils'

const { height } = Dimensions.get('window')
const MODAL_MAX_HEIGHT = height * 0.75
const OVERLAY_STYLE = { backgroundColor: 'rgba(0, 0, 0, 0.4)' }
const MODAL_ANIMATION_PROPS = {
    openAnimationConfig: {
        timing: { duration: 450 },
    },
    closeAnimationConfig: {
        timing: { duration: 300 },
    },
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
// MODAL DE EDICIÓN DE PERFIL
// =====================================================================
const EditProfileModalContent = ({ modalRef, profile, onProfileUpdated, alertRef }) => {
    const { colors } = useTheme()
    const [isSaving, setIsSaving] = useState(false)
    const [editedProfile, setEditedProfile] = useState({
        id: '',
        name: '',
        email: '',
        position: '',
        phone: '',
        roleId: 1,
    })
    const [profileErrors, setProfileErrors] = useState({
        name: [],
        email: [],
        position: [],
        phone: [],
    })
    const validators = {
        name: [required, onlyLetters],
        email: [required, validEmail],
        position: [required, onlyLetters],
        phone: [validPhone],
    }

    const runValidators = (value, fns) => fns.map((fn) => fn(value)).filter(Boolean)

    const handleInputChange = (field, value) => {
        setEditedProfile((prev) => ({ ...prev, [field]: value }))
        const fns = validators[field] || []
        const errs = runValidators(value, fns)
        setProfileErrors((prev) => ({ ...prev, [field]: errs }))
    }

    useEffect(() => {
        if (profile) {
            setEditedProfile({ ...profile })
            setProfileErrors({
                name: [],
                email: [],
                position: [],
                phone: [],
            })
        }
    }, [profile])

    const onClose = () => {
        modalRef.current?.close()
    }

    const handleSave = async () => {
        const nameErrs = runValidators(editedProfile.name, validators.name)
        const emailErrs = runValidators(editedProfile.email, validators.email)
        const positionErrs = runValidators(editedProfile.position, validators.position)
        const phoneErrs = runValidators(editedProfile.phone, validators.phone)

        if (nameErrs.length > 0 || emailErrs.length > 0 || positionErrs.length > 0 || phoneErrs.length > 0) {
            setProfileErrors({
                name: nameErrs,
                email: emailErrs,
                position: positionErrs,
                phone: phoneErrs,
            })
            alertRef.current?.show('Atención', 'Por favor corrija los errores en el formulario.', 'warning')
            return
        }

        try {
            setIsSaving(true)
            const profileToUpdate = {
                id: editedProfile.id,
                name: editedProfile.name.trim(),
                email: editedProfile.email.trim(),
                position: editedProfile.position.trim(),
                phone: editedProfile.phone?.trim() || '',
                roleId: editedProfile.roleId,
            }

            const updateResponse = await updateProfile(profileToUpdate)
            if (updateResponse.type === 'SUCCESS') {
                onClose()
                setTimeout(() => {
                    alertRef.current?.show('Éxito', 'Perfil actualizado correctamente', 'success')
                }, 300)
                if (onProfileUpdated) onProfileUpdated()
            } else {
                alertRef.current?.show('Error', 'No se pudo actualizar el perfil', 'error')
            }
        } catch (error) {
            console.error('Error update profile:', error)
            if (error.response?.data) {
                const { result, title } = error.response.data
                alertRef.current?.show('Error', title || 'Error al actualizar', 'error')
                if (result && Array.isArray(result) && result.length > 0) {
                    const newFieldErrors = { name: [], email: [], position: [], phone: [] }
                    result.forEach((validationError) => {
                        const field = validationError.field
                        const descriptions = validationError.descriptions || []
                        if (newFieldErrors.hasOwnProperty(field)) {
                            newFieldErrors[field] = descriptions
                        }
                    })
                    setProfileErrors(newFieldErrors)
                }
            } else {
                alertRef.current?.show('Error', 'Error al actualizar perfil', 'error')
            }
        } finally {
            setIsSaving(false)
        }
    }

    const hasErrors = () => {
        return (
            profileErrors.name.length > 0 ||
            profileErrors.email.length > 0 ||
            profileErrors.position.length > 0 ||
            profileErrors.phone.length > 0 ||
            !editedProfile.name.trim() ||
            !editedProfile.email.trim() ||
            !editedProfile.position.trim()
        )
    }

    return (
        <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
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
                    {profile ? (
                        <>
                            <View className="flex gap-0 mb-8">
                                <View className="flex flex-row justify-between items-center">
                                    <Text className="text-foreground text-2xl font-medium">Editar perfil</Text>
                                    <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                        <Ionicons name="close-outline" size={24} color={colors.foreground} />
                                    </Button>
                                </View>
                                <Text className="text-muted-foreground">Edite la información de su perfil</Text>
                            </View>
                            <View className="gap-6">
                                <TextField isRequired isInvalid={profileErrors.name.length > 0}>
                                    <View className="flex-row justify-between items-center mb-2">
                                        <TextField.Label className="text-foreground font-medium">Nombre</TextField.Label>
                                        <Text className="text-muted-foreground text-xs">{editedProfile.name.length} / 50</Text>
                                    </View>
                                    <TextField.Input
                                        colors={{
                                            blurBackground: colors.accentSoft,
                                            focusBackground: colors.surface2,
                                            blurBorder: profileErrors.name.length > 0 ? colors.danger : colors.accentSoft,
                                            focusBorder: profileErrors.name.length > 0 ? colors.danger : colors.surface2,
                                        }}
                                        placeholder="Nombre completo"
                                        value={editedProfile.name}
                                        onChangeText={(text) => handleInputChange('name', text)}
                                        cursorColor={colors.accent}
                                        selectionHandleColor={colors.accent}
                                        selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                        maxLength={50}
                                    >
                                        <TextField.InputEndContent>
                                            {profileErrors.name.length === 0 && editedProfile.name.trim() ? (
                                                <Ionicons name="checkmark" size={24} color={colors.accent} />
                                            ) : profileErrors.name.length > 0 ? (
                                                <Ionicons name="close" size={24} color={colors.danger} />
                                            ) : null}
                                        </TextField.InputEndContent>
                                    </TextField.Input>
                                    {profileErrors.name.length > 0 ? (
                                        <TextField.ErrorMessage>{profileErrors.name.join('\n')}</TextField.ErrorMessage>
                                    ) : undefined}
                                </TextField>

                                <TextField isRequired isInvalid={profileErrors.email.length > 0}>
                                    <View className="flex-row justify-between items-center mb-2">
                                        <TextField.Label className="text-foreground font-medium">Correo electrónico</TextField.Label>
                                        <Text className="text-muted-foreground text-xs">{editedProfile.email.length} / 50</Text>
                                    </View>
                                    <TextField.Input
                                        colors={{
                                            blurBackground: colors.accentSoft,
                                            focusBackground: colors.surface2,
                                            blurBorder: profileErrors.email.length > 0 ? colors.danger : colors.accentSoft,
                                            focusBorder: profileErrors.email.length > 0 ? colors.danger : colors.surface2,
                                        }}
                                        placeholder="correo@ejemplo.com"
                                        value={editedProfile.email}
                                        onChangeText={(text) => handleInputChange('email', text)}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        cursorColor={colors.accent}
                                        selectionHandleColor={colors.accent}
                                        selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                        maxLength={50}
                                    >
                                        <TextField.InputEndContent>
                                            {profileErrors.email.length === 0 && editedProfile.email.trim() ? (
                                                <Ionicons name="checkmark" size={24} color={colors.accent} />
                                            ) : profileErrors.email.length > 0 ? (
                                                <Ionicons name="close" size={24} color={colors.danger} />
                                            ) : null}
                                        </TextField.InputEndContent>
                                    </TextField.Input>
                                    {profileErrors.email.length > 0 ? (
                                        <TextField.ErrorMessage>{profileErrors.email.join('\n')}</TextField.ErrorMessage>
                                    ) : undefined}
                                </TextField>

                                <TextField isRequired isInvalid={profileErrors.position.length > 0}>
                                    <View className="flex-row justify-between items-center mb-2">
                                        <TextField.Label className="text-foreground font-medium">Puesto</TextField.Label>
                                        <Text className="text-muted-foreground text-xs">{editedProfile.position.length} / 50</Text>
                                    </View>
                                    <TextField.Input
                                        colors={{
                                            blurBackground: colors.accentSoft,
                                            focusBackground: colors.surface2,
                                            blurBorder: profileErrors.position.length > 0 ? colors.danger : colors.accentSoft,
                                            focusBorder: profileErrors.position.length > 0 ? colors.danger : colors.surface2,
                                        }}
                                        placeholder="Puesto actual"
                                        value={editedProfile.position}
                                        onChangeText={(text) => handleInputChange('position', text)}
                                        cursorColor={colors.accent}
                                        selectionHandleColor={colors.accent}
                                        selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                        maxLength={50}
                                    >
                                        <TextField.InputEndContent>
                                            {profileErrors.position.length === 0 && editedProfile.position.trim() ? (
                                                <Ionicons name="checkmark" size={24} color={colors.accent} />
                                            ) : profileErrors.position.length > 0 ? (
                                                <Ionicons name="close" size={24} color={colors.danger} />
                                            ) : null}
                                        </TextField.InputEndContent>
                                    </TextField.Input>
                                    {profileErrors.position.length > 0 ? (
                                        <TextField.ErrorMessage>{profileErrors.position.join('\n')}</TextField.ErrorMessage>
                                    ) : undefined}
                                </TextField>

                                <TextField isInvalid={profileErrors.phone.length > 0}>
                                    <View className="flex-row justify-between items-center mb-2">
                                        <TextField.Label className="text-foreground font-medium">Teléfono</TextField.Label>
                                        <Text className="text-muted-foreground text-xs">{editedProfile.phone?.length || 0} / 10</Text>
                                    </View>
                                    <TextField.Input
                                        colors={{
                                            blurBackground: colors.accentSoft,
                                            focusBackground: colors.surface2,
                                            blurBorder: profileErrors.phone.length > 0 ? colors.danger : colors.accentSoft,
                                            focusBorder: profileErrors.phone.length > 0 ? colors.danger : colors.surface2,
                                        }}
                                        placeholder="Teléfono (Opcional)"
                                        value={editedProfile.phone || ''}
                                        onChangeText={(text) => handleInputChange('phone', text)}
                                        keyboardType="phone-pad"
                                        cursorColor={colors.accent}
                                        selectionHandleColor={colors.accent}
                                        selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                        maxLength={10}
                                    >
                                        <TextField.InputEndContent>
                                            {profileErrors.phone.length === 0 && editedProfile.phone?.trim() && editedProfile.phone.length === 10 ? (
                                                <Ionicons name="checkmark" size={24} color={colors.accent} />
                                            ) : profileErrors.phone.length > 0 ? (
                                                <Ionicons name="close" size={24} color={colors.danger} />
                                            ) : null}
                                        </TextField.InputEndContent>
                                    </TextField.Input>
                                    {profileErrors.phone.length > 0 ? (
                                        <TextField.ErrorMessage>{profileErrors.phone.join('\n')}</TextField.ErrorMessage>
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
// MODAL DE NOTIFICACIONES
// =====================================================================
const NotificationsModalContent = ({ modalRef, alertRef }) => {
    const { colors } = useTheme()
    const [isLoading, setIsLoading] = useState(false)
    const [notices, setNotices] = useState([])

    const fetchNotices = async () => {
        try {
            setIsLoading(true)
            const response = await getMyNotices()
            // El backend devuelve ResponseObject con data que contiene la lista
            const noticesList = Array.isArray(response?.data) ? response.data : []
            setNotices(noticesList)
        } catch (error) {
            console.error('Error fetching notices:', error)
            alertRef.current?.show('Error', 'No se pudieron cargar las notificaciones', 'error')
            setNotices([])
        } finally {
            setIsLoading(false)
        }
    }

    const onClose = () => modalRef.current?.close()

    const onOpen = () => {
        fetchNotices()
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        return formatDateLiteral(dateString, true)
    }

    return (
        <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} onOpen={onOpen} modalStyle={{ backgroundColor: colors.background }}>
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
                            <Text className="text-foreground text-2xl font-medium">Notificaciones</Text>
                            <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                <Ionicons name="close-outline" size={24} color={colors.foreground} />
                            </Button>
                        </View>
                        <Text className="text-muted-foreground">Tus notificaciones activas</Text>
                    </View>

                    {isLoading ? (
                        <View className="py-10 items-center">
                            <Spinner color={colors.accent} size="lg" />
                            <Text className="text-muted-foreground mt-4">Cargando notificaciones...</Text>
                        </View>
                    ) : notices.length > 0 ? (
                        <View className="gap-3">
                            {notices.map((notice) => (
                                <View key={notice.id} className="bg-accent-soft rounded-lg p-4 border border-border/20">
                                    <View className="flex-row items-start justify-between mb-2">
                                        <View className="flex-1 pr-2">
                                            <Text className="text-foreground font-medium text-lg mb-1" numberOfLines={2}>
                                                {notice.title || 'Sin título'}
                                            </Text>
                                            {notice.description && (
                                                <Text className="text-muted-foreground text-[14px] mt-1" numberOfLines={3}>
                                                    {notice.description}
                                                </Text>
                                            )}
                                        </View>
                                        {notice.status && <View className="h-2 w-2 rounded-full bg-accent shrink-0 mt-2" />}
                                    </View>
                                    <View className="mt-3 pt-3 border-t border-border/30">
                                        <View className="flex-row items-center justify-between">
                                            {notice.createdByName && (
                                                <View className="flex-row items-center gap-2">
                                                    <Ionicons name="person-outline" size={16} color={colors.mutedForeground} />
                                                    <Text className="text-muted-foreground text-[12px]">{notice.createdByName}</Text>
                                                </View>
                                            )}
                                            {notice.createdAt && (
                                                <View className="flex-row items-center gap-2">
                                                    <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
                                                    <Text className="text-muted-foreground text-[12px]">{formatDate(notice.createdAt)}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View className="py-12 items-center">
                            <Ionicons name="notifications-off-outline" size={64} color={colors.muted} />
                            <Text className="text-muted-foreground text-lg mt-4 text-center">No hay notificaciones</Text>
                            <Text className="text-muted-foreground text-[14px] mt-2 text-center">No tienes notificaciones activas en este momento</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modalize>
    )
}

// =====================================================================
// MODAL DE CAMBIO DE CONTRASEÑA
// =====================================================================
const ChangePasswordModalContent = ({ modalRef, onPasswordChanged, alertRef }) => {
    const { colors } = useTheme()
    const [isChanging, setIsChanging] = useState(false)
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    })
    const [passwordErrors, setPasswordErrors] = useState({
        currentPassword: [],
        newPassword: [],
        confirmPassword: [],
    })
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const validators = {
        currentPassword: [required],
        newPassword: [required, minLength(8)],
        confirmPassword: [required],
    }

    const runValidators = (value, fns) => fns.map((fn) => fn(value)).filter(Boolean)

    const handleInputChange = (field, value) => {
        setPasswordData((prev) => ({ ...prev, [field]: value }))
        const fns = validators[field] || []
        const errs = runValidators(value, fns)

        // Validación adicional para confirmPassword
        if (field === 'confirmPassword' || field === 'newPassword') {
            const newPwd = field === 'newPassword' ? value : passwordData.newPassword
            const confirmPwd = field === 'confirmPassword' ? value : passwordData.confirmPassword

            if (field === 'confirmPassword' && confirmPwd && newPwd !== confirmPwd) {
                errs.push('Las contraseñas no coinciden')
            }
        }

        setPasswordErrors((prev) => ({ ...prev, [field]: errs }))
    }

    const onClose = () => {
        modalRef.current?.close()
        setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        })
        setPasswordErrors({
            currentPassword: [],
            newPassword: [],
            confirmPassword: [],
        })
        setShowCurrentPassword(false)
        setShowNewPassword(false)
        setShowConfirmPassword(false)
    }

    const handleChangePassword = async () => {
        const currentErrs = runValidators(passwordData.currentPassword, validators.currentPassword)
        const newErrs = runValidators(passwordData.newPassword, validators.newPassword)
        const confirmErrs = runValidators(passwordData.confirmPassword, validators.confirmPassword)

        // Verificar que las contraseñas coincidan
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            confirmErrs.push('Las contraseñas no coinciden')
        }

        if (currentErrs.length > 0 || newErrs.length > 0 || confirmErrs.length > 0) {
            setPasswordErrors({
                currentPassword: currentErrs,
                newPassword: newErrs,
                confirmPassword: confirmErrs,
            })
            alertRef.current?.show('Atención', 'Por favor corrija los errores en el formulario.', 'warning')
            return
        }

        try {
            setIsChanging(true)
            const response = await changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            })

            if (response.type === 'SUCCESS') {
                onClose()
                setTimeout(() => {
                    alertRef.current?.show('Éxito', 'Contraseña actualizada correctamente', 'success')
                }, 300)
                if (onPasswordChanged) onPasswordChanged()
            } else {
                alertRef.current?.show('Error', 'No se pudo cambiar la contraseña', 'error')
            }
        } catch (error) {
            console.error('Error changing password:', error)
            if (error.response?.data) {
                const { title } = error.response.data
                alertRef.current?.show('Error', title || 'Error al cambiar contraseña', 'error')
            } else {
                alertRef.current?.show('Error', 'Error al cambiar contraseña', 'error')
            }
        } finally {
            setIsChanging(false)
        }
    }

    const hasErrors = () => {
        return (
            passwordErrors.currentPassword.length > 0 ||
            passwordErrors.newPassword.length > 0 ||
            passwordErrors.confirmPassword.length > 0 ||
            !passwordData.currentPassword.trim() ||
            !passwordData.newPassword.trim() ||
            !passwordData.confirmPassword.trim() ||
            passwordData.newPassword !== passwordData.confirmPassword
        )
    }

    return (
        <Modalize ref={modalRef} {...MODAL_ANIMATION_PROPS} modalStyle={{ backgroundColor: colors.background }}>
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
                            <Text className="text-foreground text-2xl font-medium">Cambiar contraseña</Text>
                            <Button isIconOnly className="bg-transparent shrink-0" onPress={onClose}>
                                <Ionicons name="close-outline" size={24} color={colors.foreground} />
                            </Button>
                        </View>
                        <Text className="text-muted-foreground">Actualice su contraseña de acceso</Text>
                    </View>
                    <View className="gap-6">
                        <TextField isRequired isInvalid={passwordErrors.currentPassword.length > 0}>
                            <TextField.Label className="text-foreground font-medium mb-2">Contraseña actual</TextField.Label>
                            <TextField.Input
                                colors={{
                                    blurBackground: colors.accentSoft,
                                    focusBackground: colors.surface2,
                                    blurBorder: passwordErrors.currentPassword.length > 0 ? colors.danger : colors.accentSoft,
                                    focusBorder: passwordErrors.currentPassword.length > 0 ? colors.danger : colors.surface2,
                                }}
                                placeholder="Ingrese su contraseña actual"
                                value={passwordData.currentPassword}
                                onChangeText={(text) => handleInputChange('currentPassword', text)}
                                secureTextEntry={!showCurrentPassword}
                                cursorColor={colors.accent}
                                selectionHandleColor={colors.accent}
                                selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                            >
                                <TextField.InputEndContent>
                                    <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                                        <Ionicons name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={colors.muted} />
                                    </TouchableOpacity>
                                </TextField.InputEndContent>
                            </TextField.Input>
                            {passwordErrors.currentPassword.length > 0 ? (
                                <TextField.ErrorMessage>{passwordErrors.currentPassword.join('\n')}</TextField.ErrorMessage>
                            ) : undefined}
                        </TextField>

                        <TextField isRequired isInvalid={passwordErrors.newPassword.length > 0}>
                            <TextField.Label className="text-foreground font-medium mb-2">Nueva contraseña</TextField.Label>
                            <TextField.Input
                                colors={{
                                    blurBackground: colors.accentSoft,
                                    focusBackground: colors.surface2,
                                    blurBorder: passwordErrors.newPassword.length > 0 ? colors.danger : colors.accentSoft,
                                    focusBorder: passwordErrors.newPassword.length > 0 ? colors.danger : colors.surface2,
                                }}
                                placeholder="Mínimo 8 caracteres"
                                value={passwordData.newPassword}
                                onChangeText={(text) => handleInputChange('newPassword', text)}
                                secureTextEntry={!showNewPassword}
                                cursorColor={colors.accent}
                                selectionHandleColor={colors.accent}
                                selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                            >
                                <TextField.InputEndContent>
                                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                                        <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={colors.muted} />
                                    </TouchableOpacity>
                                </TextField.InputEndContent>
                            </TextField.Input>
                            {passwordErrors.newPassword.length > 0 ? (
                                <TextField.ErrorMessage>{passwordErrors.newPassword.join('\n')}</TextField.ErrorMessage>
                            ) : undefined}
                        </TextField>

                        <TextField isRequired isInvalid={passwordErrors.confirmPassword.length > 0}>
                            <TextField.Label className="text-foreground font-medium mb-2">Confirmar nueva contraseña</TextField.Label>
                            <TextField.Input
                                colors={{
                                    blurBackground: colors.accentSoft,
                                    focusBackground: colors.surface2,
                                    blurBorder: passwordErrors.confirmPassword.length > 0 ? colors.danger : colors.accentSoft,
                                    focusBorder: passwordErrors.confirmPassword.length > 0 ? colors.danger : colors.surface2,
                                }}
                                placeholder="Confirme su nueva contraseña"
                                value={passwordData.confirmPassword}
                                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                                secureTextEntry={!showConfirmPassword}
                                cursorColor={colors.accent}
                                selectionHandleColor={colors.accent}
                                selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                            >
                                <TextField.InputEndContent>
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={colors.muted} />
                                    </TouchableOpacity>
                                </TextField.InputEndContent>
                            </TextField.Input>
                            {passwordErrors.confirmPassword.length > 0 ? (
                                <TextField.ErrorMessage>{passwordErrors.confirmPassword.join('\n')}</TextField.ErrorMessage>
                            ) : undefined}
                        </TextField>
                    </View>
                    <View className="flex-row justify-end gap-3 pt-8">
                        <Button className="flex-1" variant="primary" onPress={handleChangePassword} isDisabled={isChanging || hasErrors()}>
                            {isChanging ? (
                                <>
                                    <Spinner color={colors.accentForeground} size="md" />
                                    <Button.Label>Cambiando...</Button.Label>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="key-outline" size={24} color={colors.accentForeground} />
                                    <Button.Label>Cambiar contraseña</Button.Label>
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
// PANTALLA PRINCIPAL DE PERFIL
// =====================================================================
const ProfileScreen = () => {
    const [isLoading, setIsLoading] = useState(true)
    const [profile, setProfile] = useState(null)
    const { logout } = useAuth()
    const { colors } = useTheme()
    // Referencias para modales
    const editModalRef = useRef(null)
    const passwordModalRef = useRef(null)
    const alertRef = useRef(null)
    const notificationsModalRef = useRef(null)

    const fetchProfile = async () => {
        try {
            setIsLoading(true)
            const response = await getProfile()
            if (response?.data) {
                setProfile({
                    ...response.data,
                    role: response.data.roleName || 'Usuario',
                    roleId: response.data.roleName === 'ADMIN' ? 1 : 2,
                    status: response.data.status ? 'Activo' : 'Inactivo',
                })
                console.log(response.data)
            }
        } catch (err) {
            console.error('Error fetching profile:', err)
            alertRef.current?.show('Error', 'No se pudo cargar el perfil', 'error')
            logout()
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchProfile()
    }, [])

    const openNotificationsModal = () => {
        setTimeout(() => {
            notificationsModalRef.current?.open()
        }, 0)
    }

    const openEditModal = () => {
        setTimeout(() => {
            editModalRef.current?.open()
        }, 0)
    }

    const openPasswordModal = () => {
        setTimeout(() => {
            passwordModalRef.current?.open()
        }, 0)
    }

    return (
        <View style={{ flex: 1 }}>
            {/*
            <View style={{ flex: 1 }}>
                <ScrollableLayout onRefresh={fetchProfile}>
                    <View className="p-[6%] min-h-full">
                        <View className="flex flex-col w-full justify-between shrink-0 gap-4 items-end">
                            <View className="w-full flex flex-row justify-between items-center">
                                <View className="flex flex-row items-center justify-center gap-2">
                                    <Text className="font-bold text-[32px] text-foreground">Perfil</Text>
                                </View>
                                <View className="flex flex-row gap-0 items-center">
                                    <Button isIconOnly className="bg-transparent shrink-0" isDisabled={isLoading} onPress={openPasswordModal}>
                                        <Ionicons name="key-outline" size={24} color={colors.foreground} />
                                    </Button>
                                    <Button isIconOnly className="font-semibold shrink-0" isDisabled={isLoading} onPress={openEditModal}>
                                        <Ionicons name="create-outline" size={24} color={colors.accentForeground} />
                                    </Button>
                                </View>
                            </View>
                        </View>

                        {isLoading ? (
                            <View className="flex-1 justify-center items-center mt-20">
                                <Spinner color={colors.foreground} size="lg" />
                            </View>
                        ) : profile ? (
                            <View className="mt-4">
                                <View className="bg-accent-soft rounded-lg p-4 mb-4">
                                    <View className="flex-row items-center mb-4">
                                        <View className="h-16 w-16 rounded-full bg-accent items-center justify-center mr-4">
                                            <Text className="text-accent-foreground text-2xl font-medium">{profile.name.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-foreground text-2xl font-semibold" numberOfLines={1}>
                                                {profile.name}
                                            </Text>
                                            <Text className="text-muted-foreground text-sm" numberOfLines={1}>
                                                {profile.email}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="gap-4">
                                        <View className="flex-row items-start justify-between border-b border-surface-2 pb-3">
                                            <Text className="text-muted-foreground w-28">Puesto</Text>
                                            <Text className="text-foreground text-right flex-1" numberOfLines={2}>
                                                {profile.position}
                                            </Text>
                                        </View>

                                        <View className="flex-row items-start justify-between border-b border-surface-2 pb-3">
                                            <Text className="text-muted-foreground w-28">Rol</Text>
                                            <Text className="text-foreground text-right flex-1" numberOfLines={2}>
                                                {profile.role}
                                            </Text>
                                        </View>

                                        <View className="flex-row items-start justify-between border-b border-surface-2 pb-3">
                                            <Text className="text-muted-foreground w-28">Teléfono</Text>
                                            <Text
                                                className={`text-right flex-1 ${profile.phone ? 'text-foreground' : 'text-muted-foreground italic'}`}
                                                numberOfLines={2}
                                            >
                                                {profile.phone || 'No especificado'}
                                            </Text>
                                        </View>

                                        <View className="flex-row items-start justify-between">
                                            <Text className="text-muted-foreground w-28">Estado</Text>
                                            <View className="flex-row items-center gap-2">
                                                <View className={`h-2 w-2 rounded-full ${profile.status === 'activo' ? 'bg-accent' : 'bg-muted-foreground'}`} />
                                                <Text className="text-foreground capitalize">{profile.status}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View className="gap-3">
                                    <Button variant="primary" onPress={openEditModal} className="w-full">
                                        <Ionicons name="create-outline" size={24} color={colors.accentForeground} />
                                        <Button.Label>Editar perfil</Button.Label>
                                    </Button>

                                    <Button variant="secondary" onPress={openPasswordModal} className="w-full">
                                        <Ionicons name="key-outline" size={24} color={colors.foreground} />
                                        <Button.Label>Cambiar contraseña</Button.Label>
                                    </Button>
                                    <Button isIconOnly className="shrink-0" variant="danger" onPress={logout}>
                                        <Ionicons name="log-out-outline" size={24} color={colors.dangerForeground} />
                                    </Button>
                                </View>
                            </View>
                        ) : (
                            <View className="flex-1 justify-center items-center mt-20">
                                <Text className="text-muted-foreground">No se pudo cargar el perfil</Text>
                            </View>
                        )}
                    </View>
                </ScrollableLayout>

                <EditProfileModalContent modalRef={editModalRef} profile={profile} onProfileUpdated={fetchProfile} alertRef={alertRef} />

                <ChangePasswordModalContent modalRef={passwordModalRef} onPasswordChanged={() => {}} alertRef={alertRef} />

                <CustomAlert ref={alertRef} />
            </View> 
            */}

            <ScrollableLayout onRefresh={fetchProfile}>
                <View className="min-h-full">
                    {/* CABECERA Y AVATAR */}
                    {/* CABECERA Y AVATAR CON GRADIENTE */}
                    <View className="overflow-hidden rounded-b-[32px] shadow-sm">
                        <LinearGradient
                            colors={[colors.background, colors.accentSoft]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={{ padding: '6%', paddingBottom: '12%' }}
                        >
                            {/* ... lógica de loading/profile ... */}
                            <View className="flex-row justify-between items-center mb-6">
                                <Text className="font-bold text-[32px] text-foreground">Perfil</Text>
                                <View className="flex-row gap-0 items-center">
                                    <ThemeSwitcher />
                                    <Button isIconOnly className="size-12 bg-transparent shrink-0" isDisabled={isLoading} onPress={openNotificationsModal}>
                                        <Ionicons name="notifications-outline" size={24} color={colors.foreground} />
                                    </Button>
                                    <Button isIconOnly className="size-12 bg-transparent shrink-0" isDisabled={isLoading} onPress={openPasswordModal}>
                                        <Ionicons name="key-outline" size={24} color={colors.foreground} />
                                    </Button>
                                    <Button
                                        isIconOnly
                                        className="size-12 font-semibold shrink-0"
                                        variant="primary"
                                        isDisabled={isLoading}
                                        onPress={openEditModal}
                                    >
                                        <Ionicons name="create-outline" size={24} color={colors.accentForeground} />
                                    </Button>
                                </View>
                            </View>

                            {isLoading ? (
                                <View className="py-10 items-center">
                                    <Spinner size="lg" color={colors.accent} />
                                </View>
                            ) : profile ? (
                                <View className="items-center">
                                    <View className="h-24 w-24 rounded-full bg-accent items-center justify-center mb-4 border-4 border-background shadow-md">
                                        <Text className="text-accent-foreground text-4xl font-bold">{profile.name?.charAt(0).toUpperCase()}</Text>
                                        {/* Indicador de estado */}
                                        <View
                                            className={`absolute bottom-0 right-0 h-6 w-6 rounded-full border-2 border-background ${profile.status === 'Activo' ? 'bg-success' : 'bg-danger'}`}
                                        />
                                    </View>
                                    <Text className="text-foreground text-2xl font-medium text-center">{profile.name}</Text>
                                    <Text className="text-muted-foreground text-[14px] text-center mt-1">{profile.email}</Text>

                                    <View className="flex-row items-center bg-surface-2 px-2 py-2 mt-4 rounded-lg">
                                        <Text className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">{profile.role}</Text>
                                    </View>
                                </View>
                            ) : (
                                <Text className="text-center text-muted-foreground">No se pudo cargar el perfil</Text>
                            )}
                        </LinearGradient>
                    </View>
                    {/* INFORMACIÓN DETALLADA */}
                    {profile && !isLoading && (
                        <View className="p-[6%] flex-1">
                            {/* BLOQUE DE INFORMACIÓN (Estilo Cards Individuales) */}
                            <View className="mb-4">
                                <Text className="text-[12px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Información personal</Text>

                                {/* AQUI: Usamos gap-2 para el espaciado y quitamos el contenedor bg-accent-soft padre */}
                                <View className="gap-2">
                                    <ProfileCardItem icon="briefcase-outline" label="Puesto" value={profile.position} colors={colors} />

                                    <ProfileCardItem icon="call-outline" label="Teléfono" value={profile.phone} colors={colors} />

                                    <ProfileCardItem icon="shield-checkmark-outline" label="Estado" value={profile.status} colors={colors} />
                                </View>
                            </View>

                            {/* BOTÓN CERRAR SESIÓN */}
                            <Text className="text-[12px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Opciones</Text>
                            <View>
                                <Button className="bg-danger/10 rounded-lg h-auto p-4 flex-row justify-start" onPress={logout}>
                                    <View className="h-12 w-12 items-center justify-center mr-4">
                                        <Ionicons name="log-out-outline" size={24} color={colors.danger} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-danger font-medium text-lg mb-1">Cerrar sesión</Text>
                                        <Text className="text-danger/70 text-[14px]">Salir de la aplicación</Text>
                                    </View>
                                    <View className="h-12 w-12 items-center justify-center">
                                        <Ionicons name="chevron-forward-outline" size={24} color={colors.danger} />
                                    </View>
                                </Button>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollableLayout>

            {/* Modales */}
            <EditProfileModalContent modalRef={editModalRef} profile={profile} onProfileUpdated={fetchProfile} alertRef={alertRef} />
            <ChangePasswordModalContent modalRef={passwordModalRef} onPasswordChanged={() => {}} alertRef={alertRef} />
            <NotificationsModalContent modalRef={notificationsModalRef} alertRef={alertRef} />
            <CustomAlert ref={alertRef} />
        </View>
    )
}

// NUEVO COMPONENTE DE ITEM TIPO CARD (Individual)
// - Tiene su propio fondo (bg-accent-soft)
// - Tiene sus bordes redondeados (rounded-lg)
// - No tiene bordes inferiores (border-b eliminado)
const ProfileCardItem = ({ icon, label, value, colors }) => (
    <View className="flex-row items-center py-3">
        {/* Solo padding vertical y borde sutil */}
        {/* Icono: Sin caja contenedora, alineado con el texto */}
        <View className="mr-4">
            <Ionicons name={icon} size={22} color={colors.mutedForeground} />
        </View>
        <View className="flex-1">
            {/* Value: Mantenemos el énfasis pero quitamos peso si es necesario */}
            <Text className="text-foreground font-medium text-base mb-0.5">{value || 'No especificado'}</Text>

            {/* Label: Más sutil */}
            <Text className="text-muted-foreground text-xs uppercase tracking-wide opacity-70">{label}</Text>
        </View>
    </View>
)

export default ProfileScreen
