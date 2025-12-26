import { api } from './config/api'

// ==================== UNIDADES DE MEDIDA ====================

// Obtener todas las unidades de medida
export const getUnitsOfMeasurement = async () => {
    try {
        const response = await api.get('/api/units-of-measurement')
        return response.data
    } catch (error) {
        console.error('[getUnitsOfMeasurement] Error:', error)
        throw error
    }
}

// Obtener unidades principales
export const getMainUnits = async () => {
    try {
        const response = await api.get('/api/units-of-measurement/main')
        return response.data
    } catch (error) {
        console.error('[getMainUnits] Error:', error)
        throw error
    }
}

// Obtener sub-unidades de una unidad
export const getSubUnits = async (id) => {
    try {
        const response = await api.get(`/api/units-of-measurement/${id}/sub-units`)
        return response.data
    } catch (error) {
        console.error('[getSubUnits] Error:', error)
        throw error
    }
}

// Obtener unidad de medida por ID
export const getUnitOfMeasurementById = async (id) => {
    try {
        const response = await api.get(`/api/units-of-measurement/${id}`)
        return response.data
    } catch (error) {
        console.error('[getUnitOfMeasurementById] Error:', error)
        throw error
    }
}

// Crear una nueva unidad de medida
export const createUnitOfMeasurement = async (unitData) => {
    try {
        const response = await api.post('/api/units-of-measurement', unitData)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }
        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[createUnitOfMeasurement] Error:', error)
        throw error
    }
}

// Actualizar una unidad de medida
export const updateUnitOfMeasurement = async (id, unitData) => {
    try {
        const response = await api.put(`/api/units-of-measurement/${id}`, unitData)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }
        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[updateUnitOfMeasurement] Error:', error)
        throw error
    }
}

// Eliminar una unidad de medida
export const deleteUnitOfMeasurement = async (id) => {
    try {
        const response = await api.delete(`/api/units-of-measurement/${id}`)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }
        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[deleteUnitOfMeasurement] Error:', error)
        throw error
    }
}
