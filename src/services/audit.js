import { api } from './config/api'

// ==================== AUDIT LOGS ====================

// Obtener todos los logs de auditoría
// El backend devuelve directamente una lista de AuditLogDto
export const getAuditLogs = async () => {
    try {
        const response = await api.get('/api/audit-logs')
        // El backend devuelve directamente la lista, no un objeto con data
        return Array.isArray(response.data) ? response.data : []
    } catch (error) {
        console.error('[getAuditLogs] Error:', error)
        throw error
    }
}

// Obtener logs de auditoría por email de usuario
// El backend devuelve directamente una lista de AuditLogDto
export const getAuditLogsByUserEmail = async (email) => {
    try {
        const response = await api.get(`/api/audit-logs/user/${email}`)
        // El backend devuelve directamente la lista, no un objeto con data
        return Array.isArray(response.data) ? response.data : []
    } catch (error) {
        console.error('[getAuditLogsByUserEmail] Error:', error)
        throw error
    }
}
