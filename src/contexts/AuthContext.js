import * as SecureStore from 'expo-secure-store'
import { createContext, useContext, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { setSessionExpiredCallback } from '../services/config/api'
import { loginRequest } from '../services/auth'

const AuthContext = createContext()

export const useAuth = () => {
    return useContext(AuthContext)
}

export const AuthProvider = ({ children }) => {
    const [userToken, setUserToken] = useState(null)
    const [userRole, setUserRole] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    const handleLogout = async () => {
        await SecureStore.deleteItemAsync('userToken')
        await SecureStore.deleteItemAsync('userRole')

        setUserToken(null)
        setUserRole(null)

        // NOTA: No necesitamos limpiar la cabecera de Axios manualmente.
        // El interceptor de solicitud intentará obtener el token,
        // no lo encontrará, y la siguiente solicitud se enviará sin autorización.
    }

    // 2. Conectamos el interceptor de 401 (expiración de sesión) a nuestra función de logout
    // Esto se ejecuta solo una vez cuando se monta el AuthProvider
    useEffect(() => {
        setSessionExpiredCallback(handleLogout)
    }, [])

    useEffect(() => {
        // Al cargar la app, intentar recuperar el TOKEN
        const bootstrapAsync = async () => {
            let token
            let role
            try {
                // 1. Usamos SecureStore para obtener el token encriptado
                token = await SecureStore.getItemAsync('userToken')
                role = await SecureStore.getItemAsync('userRole')
                if (token) {
                    // 2. Decodificamos el token para extraer el rol
                    // Asegúrate de que tu JWT de Spring Boot incluya el "role"

                    if (role) {
                        // 3. Establecemos el estado
                        setUserToken(token)
                        setUserRole(role)

                        // IMPORTANTE: Ya NO necesitamos configurar Axios aquí.
                        // El interceptor de solicitud se encargará de esto automáticamente.
                        // api.defaults.headers.common['Authorization'] = `Bearer ${token}`; // <-- ELIMINADO
                    } else {
                        // El token es inválido o no tiene rol
                        throw new Error('Token inválido o malformado')
                    }
                }
            } catch (e) {
                // Error al restaurar o decodificar el token, forzamos logout
                console.error('Error al restaurar token', e)
                await SecureStore.deleteItemAsync('userToken')
                // api.defaults.headers.common['Authorization'] = null; // <-- ELIMINADO
            }

            // 4. Terminamos la carga
            setIsLoading(false)
        }

        bootstrapAsync()
    }, [])

    const authContextValue = {
        login: async (email, password) => {
            try {
                const responseData = await loginRequest({ email, password })
                console.log(responseData)
                // La respuesta ya es response.data (el objeto Message)
                const token = responseData.data.token
                console.log(token)
                // 3. Decodificamos el token INMEDIATAMENTE para obtener el rol
                const roleFromToken = responseData.data.roles[0].authority // Confirma que tu JWT incluya 'role'
                console.log(roleFromToken)
                if (!roleFromToken) {
                    throw new Error('Token recibido no contiene un rol.')
                }

                // 4. Guardar SOLO EL TOKEN en almacenamiento seguro
                await SecureStore.setItemAsync('userToken', token)
                await SecureStore.setItemAsync('userRole', roleFromToken)

                // 5. Ya NO necesitamos configurar la cabecera de Axios aquí.
                // El interceptor lo hará en la próxima solicitud.
                // api.defaults.headers.common['Authorization'] = `Bearer ${token}`; // <-- ELIMINADO

                // 6. Establecer estado de React
                setUserToken(token)
                setUserRole(roleFromToken)
            } catch (error) {
                throw error
            }
        },
        logout: handleLogout,
        userToken,
        userRole,
        isLoading,
    }

    return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>
}
