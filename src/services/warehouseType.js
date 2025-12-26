import { api } from './config/api'

// ==================== TIPOS DE ALMACÉN ====================

// Obtener todos los tipos de almacén
export const getWarehouseTypes = async () => {
    try {
        const response = await api.get('/api/warehouse-types')
        return response.data
    } catch (error) {
        console.error('[getWarehouseTypes] Error:', error)
        throw error
    }
}

// Obtener tipo de almacén por ID
export const getWarehouseTypeById = async (id) => {
    try {
        const response = await api.get(`/api/warehouse-types/${id}`)
        return response.data
    } catch (error) {
        console.error('[getWarehouseTypeById] Error:', error)
        throw error
    }
}

// Crear un nuevo tipo de almacén
export const createWarehouseType = async (warehouseTypeData) => {
    try {
        const response = await api.post('/api/warehouse-types', warehouseTypeData)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }
        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[createWarehouseType] Error:', error)
        throw error
    }
}

// Actualizar un tipo de almacén
export const updateWarehouseType = async (id, warehouseTypeData) => {
    try {
        const response = await api.put(`/api/warehouse-types/${id}`, warehouseTypeData)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }
        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[updateWarehouseType] Error:', error)
        throw error
    }
}

// Eliminar un tipo de almacén
export const deleteWarehouseType = async (id) => {
    try {
        const response = await api.delete(`/api/warehouse-types/${id}`)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }
        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[deleteWarehouseType] Error:', error)
        throw error
    }
}
