import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

// Callback para manejar la expiración de sesión (será "inyectado" desde AuthContext)
let onSessionExpired = null

export const setSessionExpiredCallback = (callback) => {
    onSessionExpired = callback
}

// Importar la variable de entorno (react-native-dotenv la reemplazará en tiempo de compilación)
// En desarrollo: lee de .env
// En producción EAS Build: lee de las variables de entorno configuradas en eas.json o dashboard
import { API_BASE_URL as ENV_API_BASE_URL } from '@env'

// Obtener la URL de la API con fallback
// react-native-dotenv reemplazará @env en tiempo de compilación
// Si no está disponible, usar el valor por defecto de producción
const API_BASE_URL = (ENV_API_BASE_URL || 'https://sgi-backend-ok03.onrender.com')
    .toString()
    .trim()
    .replace(/\/$/, '')

// Log para verificar que la URL se cargó correctamente
if (ENV_API_BASE_URL) {
    console.log('[API] ✅ URL base configurada desde variables de entorno:', API_BASE_URL)
} else {
    console.warn('[API] ⚠️ Usando URL por defecto. Verifica que API_BASE_URL esté en .env o en EAS variables.')
    console.log('[API] URL base (por defecto):', API_BASE_URL)
}

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Interceptor de Solicitud (Request)
// Se ejecuta ANTES de CADA solicitud que use esta instancia "api"
api.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('userToken')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    },
)

// Interceptor de Respuesta (Response)
// Se ejecuta DESPUÉS de CADA respuesta
api.interceptors.response.use(
    (response) => response, // Si la respuesta es 2xx, simplemente la devuelve
    (error) => {
        // Manejamos errores
        const status = error.response?.status

        // Si no hay respuesta del servidor (problema de conexión)
        if (!error.response) {
            console.error('[API] Error de conexión:', error.message)
            console.error('[API] URL base:', API_BASE_URL)
            console.error('[API] Error code:', error.code)
            console.error('[API] Error config:', error.config?.url)
            
            // Crear un error más descriptivo
            let errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet.'
            if (error.code === 'ECONNABORTED') {
                errorMessage = 'Tiempo de espera agotado. El servidor no responde.'
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                errorMessage = 'No se pudo conectar al servidor. Verifica que la URL sea correcta y que el servidor esté disponible.'
            }
            
            const connectionError = new Error(errorMessage)
            connectionError.isConnectionError = true
            connectionError.originalError = error
            return Promise.reject(connectionError)
        }

        if (status === 401) {
            // ¡Sesión expirada o token inválido!
            // Ejecutamos el callback (nuestro "evento" sessionExpired) si ha sido configurado
            if (onSessionExpired) {
                onSessionExpired()
            }
        }

        // Rechazamos la promesa para que el .catch() en la llamada original (ej. en LoginScreen) también se ejecute.
        return Promise.reject(error)
    },
)

export { api }
