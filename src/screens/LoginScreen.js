import { useCallback, useState } from 'react'
import { View, Text, Platform, RefreshControl, Linking, Alert } from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Spinner, TextField, useTheme } from 'heroui-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { Ionicons } from '@expo/vector-icons'
import ThemeSwitcher from '../components/ThemeSwitcher'
import { required, validEmail, validPassword } from '../utils/validators'
import { forgotPasswordRequest } from '../services/auth'

const LoginScreen = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [isVisible, setIsVisible] = useState(false)
    const { login } = useAuth()
    const { colors } = useTheme()

    const [isRefreshing, setIsRefreshing] = useState(false)

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    })

    const [fieldErrors, setFieldErrors] = useState({
        email: [],
        password: [],
    })

    const [submitError, setSubmitError] = useState('')

    const validators = {
        email: [required, validEmail],
        password: [required, validPassword],
    }

    const runValidators = (value, fns) => fns.map((fn) => fn(value)).filter(Boolean)

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }))

        const fns = validators[field] || []
        const errs = runValidators(value, fns)
        setFieldErrors((prev) => ({ ...prev, [field]: errs }))

        if (submitError) {
            setSubmitError('')
        }
    }

    const hasFormErrors = () => {
        if (fieldErrors.email.length > 0 || fieldErrors.password.length > 0) {
            return true
        }
        if (formData.email.trim() === '' || formData.password.trim() === '') {
            return true
        }
        return false
    }

    const toggleVisibility = () => setIsVisible(!isVisible)

    const onRefresh = useCallback(() => {
        setIsRefreshing(true)
        setFormData({ email: '', password: '' })
        setFieldErrors({ email: [], password: [] })
        setSubmitError('')
        setIsLoading(false)
        setIsVisible(false)

        setTimeout(() => {
            setIsRefreshing(false)
        }, 1000)
    }, [])

    const handleLogin = async () => {
        const emailErrs = runValidators(formData.email, validators.email)
        const passwordErrs = runValidators(formData.password, validators.password)

        if (emailErrs.length > 0 || passwordErrs.length > 0) {
            setFieldErrors({ email: emailErrs, password: passwordErrs })
            setSubmitError('Por favor, corrija los errores en el formulario.')
            return
        }

        setFieldErrors({ email: [], password: [] })
        setSubmitError('')

        try {
            setIsLoading(true)
            await login(formData.email, formData.password)
        } catch (e) {
            console.error('[LoginScreen] Error completo:', e)
            console.error('[LoginScreen] Error message:', e.message)
            console.error('[LoginScreen] Error response:', e.response)
            console.error('[LoginScreen] Error isConnectionError:', e.isConnectionError)

            // Manejar errores de conexión
            if (e.isConnectionError || !e.response) {
                setSubmitError('No se pudo conectar con el servidor. Verifica tu conexión a internet y que el servidor esté disponible.')
                setFieldErrors({ email: [], password: [] })
            } else if (e.response?.data) {
                // Manejar errores del servidor con respuesta
                const { result, title, description } = e.response.data
                setSubmitError(title || description || 'Error al iniciar sesión.')

                if (result && Array.isArray(result) && result.length > 0) {
                    const newFieldErrors = { email: [], password: [] }
                    result.forEach((validationError) => {
                        const field = validationError.field
                        const descriptions = validationError.descriptions || []
                        if (newFieldErrors.hasOwnProperty(field)) {
                            newFieldErrors[field] = descriptions
                        }
                    })
                    setFieldErrors(newFieldErrors)
                } else {
                    setFieldErrors({ email: [], password: [] })
                }
            } else {
                // Error desconocido
                setSubmitError('Error inesperado. Por favor, intenta nuevamente.')
                setFieldErrors({ email: [], password: [] })
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAwareScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                }}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid={true}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />}
            >
                <View className="flex-1 px-[6%] justify-center py-[6%]">
                    {/* Header Top-Right */}
                    <View className="absolute top-[6%] right-[6%] z-10">
                        <ThemeSwitcher />
                    </View>

                    {/* Header Logo & Title */}
                    <View className="items-center mb-10">
                        <View className="w-16 h-16 items-center justify-center mb-6">
                            <Ionicons name="cube-outline" size={44} color={colors.accent} />
                        </View>
                        <Text className="font-bold text-[32px] text-foreground text-center mb-2">¡Bienvenido!</Text>
                        <Text className="text-base text-center text-muted-foreground px-4">Inicia sesión para continuar</Text>
                    </View>

                    {/* Error General */}
                    {submitError ? (
                        <View className="mb-8 p-4 flex-row items-center rounded-lg bg-danger/10">
                            <Ionicons name="alert-circle-outline" size={24} color={colors.danger} />
                            <Text className="font-medium ml-3 flex-1" style={{ color: colors.danger }}>
                                {submitError}
                            </Text>
                        </View>
                    ) : null}

                    {/* Formulario */}
                    <View className="gap-8">
                        <TextField isRequired isInvalid={fieldErrors.email.length > 0}>
                            <TextField.Label classNames={{ asterisk: 'text-danger' }}>Correo electrónico</TextField.Label>
                            <TextField.Input
                                colors={{
                                    blurBackground: colors.accentSoft,
                                    focusBackground: colors.surface2,
                                    blurBorder: colors.accentSoft,
                                    focusBorder: colors.surface2,
                                }}
                                placeholder="ejemplo@correo.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={formData.email}
                                onChangeText={(value) => handleInputChange('email', value)}
                                cursorColor={colors.accent}
                                selectionHandleColor={colors.accent}
                                selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                            />
                            {fieldErrors.email.length > 0 && <TextField.ErrorMessage>{fieldErrors.email.join('\n')}</TextField.ErrorMessage>}
                        </TextField>

                        <TextField isRequired isInvalid={fieldErrors.password.length > 0}>
                            <TextField.Label classNames={{ asterisk: 'text-danger' }}>Contraseña</TextField.Label>
                            <TextField.Input
                                colors={{
                                    blurBackground: colors.accentSoft,
                                    focusBackground: colors.surface2,
                                    blurBorder: colors.accentSoft,
                                    focusBorder: colors.surface2,
                                }}
                                placeholder="••••••••"
                                value={formData.password}
                                onChangeText={(value) => handleInputChange('password', value)}
                                cursorColor={colors.accent}
                                selectionHandleColor={colors.accent}
                                selectionColor={Platform.OS === 'ios' ? colors.accent : colors.muted}
                                secureTextEntry={!isVisible}
                            >
                                <TextField.InputEndContent
                                    name="right"
                                    classNames={{
                                        container: 'flex justify-center items-center pr-2',
                                    }}
                                >
                                    <Button onPress={toggleVisibility} className="bg-transparent" isIconOnly>
                                        <Ionicons
                                            name={isVisible ? 'eye-off-outline' : 'eye-outline'}
                                            size={22}
                                            color={fieldErrors.password.length > 0 ? colors.danger : colors.mutedForeground}
                                        />
                                    </Button>
                                </TextField.InputEndContent>
                            </TextField.Input>
                            {fieldErrors.password.length > 0 && <TextField.ErrorMessage>{fieldErrors.password.join('\n')}</TextField.ErrorMessage>}
                        </TextField>

                        <View className="mt-4">
                            <Button onPress={handleLogin} isDisabled={hasFormErrors() || isLoading} className="h-12 shadow-sm">
                                {isLoading ? (
                                    <>
                                        <Spinner color={colors.accentForeground} size="md" />
                                        <Button.Label>Ingresando...</Button.Label>
                                    </>
                                ) : (
                                    <>
                                        <Ionicons name="log-in-outline" size={24} color={colors.accentForeground} />
                                        <Button.Label>Ingresar</Button.Label>
                                    </>
                                )}
                            </Button>
                        </View>

                        {/* Link de recuperación de contraseña */}
                        <View className="mt-4 items-center">
                            <Button
                                variant="ghost"
                                className="bg-transparent"
                                onPress={async () => {
                                    try {
                                        const email = formData.email.trim()
                                        if (!email) {
                                            setSubmitError('Por favor ingrese su correo electrónico para recuperar su contraseña')
                                            return
                                        }
                                        const emailErrs = runValidators(email, validators.email)
                                        if (emailErrs.length > 0) {
                                            setSubmitError('Por favor ingrese un correo electrónico válido')
                                            return
                                        }
                                        setIsLoading(true)
                                        await forgotPasswordRequest(email)
                                        setSubmitError('')
                                        Alert.alert('Éxito', 'Se ha enviado un enlace de recuperación a su correo electrónico')
                                    } catch (error) {
                                        console.error('Error forgot password:', error)
                                        if (error.response?.data) {
                                            const { title, description } = error.response.data
                                            setSubmitError(title || description || 'Error al solicitar recuperación de contraseña')
                                        } else {
                                            setSubmitError('Error al solicitar recuperación de contraseña. Verifique su conexión.')
                                        }
                                    } finally {
                                        setIsLoading(false)
                                    }
                                }}
                            >
                                <Text style={{ color: colors.accent }} className="text-sm underline">
                                    ¿Olvidaste tu contraseña?
                                </Text>
                            </Button>
                        </View>
                    </View>

                    {/* Footer */}
                    <View className="mt-12 items-center">
                        <Text style={{ color: colors.mutedForeground }} className="text-xs">
                            © 2025
                        </Text>
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    )
}

export default LoginScreen
