import { api } from './config/api'

// ==================== NOTICES ====================

// Obtener mis notificaciones activas
export const getMyNotices = async () => {
    try {
        const response = await api.get('/api/notices/my-notices')
        return response.data
    } catch (error) {
        console.error('[getMyNotices] Error:', error)
        throw error
    }
}

// Obtener todas mis notificaciones (activas e inactivas)
export const getAllMyNotices = async () => {
    try {
        const response = await api.get('/api/notices/my-all-notices')
        return response.data
    } catch (error) {
        console.error('[getAllMyNotices] Error:', error)
        throw error
    }
}

// Obtener todas las notificaciones
export const getAllNotices = async () => {
    try {
        const response = await api.get('/api/notices/all')
        return response.data
    } catch (error) {
        console.error('[getAllNotices] Error:', error)
        throw error
    }
}

// Obtener todas las notificaciones activas
export const getActiveNotices = async () => {
    try {
        const response = await api.get('/api/notices/active')
        return response.data
    } catch (error) {
        console.error('[getActiveNotices] Error:', error)
        throw error
    }
}

// Obtener conteo de notificaciones
export const getNoticeCount = async () => {
    try {
        const response = await api.get('/api/notices/count')
        return response.data
    } catch (error) {
        console.error('[getNoticeCount] Error:', error)
        throw error
    }
}
