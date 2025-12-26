import { api } from './config/api'

// ==================== PRODUCTOS ====================

// Obtener todos los productos con paginación y filtros
export const getProducts = async (page = 0, size = 100, stockCatalogueId = null, statusId = null) => {
    try {
        const response = await api.get('/api/products', {
            params: {
                page,
                size,
                stockCatalogueId,
                statusId,
            },
        })
        return response.data
    } catch (error) {
        console.error('[getProducts] Error:', error)
        throw error
    }
}

// Crear un nuevo producto
export const createProduct = async (productData) => {
    try {
        const response = await api.post('/api/products', productData)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }

        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[createProduct] Error:', error)
        throw error
    }
}

// Obtener producto por QR hash
export const getProductByQrHash = async (hash) => {
    try {
        const response = await api.get(`/api/products/qr/${hash}`)
        return response.data
    } catch (error) {
        console.error('[getProductByQrHash] Error:', error)
        throw error
    }
}

// Obtener imagen QR de un producto
export const getQrCodeImage = async (hash) => {
    try {
        const response = await api.get(`/api/products/qr/${hash}/image`, {
            responseType: 'blob',
        })
        return response.data
    } catch (error) {
        console.error('[getQrCodeImage] Error:', error)
        throw error
    }
}

// ==================== CATÁLOGOS DE STOCK ====================

// Obtener todos los catálogos de stock
// El backend solo acepta el parámetro 'search', no tiene paginación
export const getStockCatalogues = async (search = '') => {
    try {
        const response = await api.get('/api/stock-catalogues', {
            params: {
                ...(search && { search }),
            },
        })
        return response.data
    } catch (error) {
        console.error('[getStockCatalogues] Error:', error)
        throw error
    }
}

// Crear catálogo de stock
export const createStockCatalogue = async (catalogueData) => {
    try {
        const response = await api.post('/api/stock-catalogues', catalogueData)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }
        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[createStockCatalogue] Error:', error)
        throw error
    }
}

// Actualizar catálogo de stock
export const updateStockCatalogue = async (catalogueData) => {
    try {
        const response = await api.put('/api/stock-catalogues', catalogueData)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }
        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[updateStockCatalogue] Error:', error)
        throw error
    }
}

// Eliminar catálogo de stock
export const deleteStockCatalogue = async (id) => {
    try {
        const response = await api.delete(`/api/stock-catalogues/${id}`)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }
        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[deleteStockCatalogue] Error:', error)
        throw error
    }
}

// Cambiar estado del catálogo de stock (toggle)
export const toggleStockCatalogueStatus = async (id) => {
    try {
        const response = await api.patch(`/api/stock-catalogues/${id}/toggle-status`)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }
        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[toggleStockCatalogueStatus] Error:', error)
        throw error
    }
}

// Obtener catálogo de stock por ID
export const getStockCatalogueById = async (id) => {
    try {
        const response = await api.get(`/api/stock-catalogues/${id}`)
        return response.data
    } catch (error) {
        console.error('[getStockCatalogueById] Error:', error)
        throw error
    }
}

// ==================== ESTADOS DE PRODUCTOS ====================

// Obtener todos los estados de productos
export const getProductStatuses = async () => {
    try {
        const response = await api.get('/api/product-statuses')
        return response.data
    } catch (error) {
        console.error('[getProductStatuses] Error:', error)
        throw error
    }
}

// Crear estado de producto
export const createProductStatus = async (statusData) => {
    try {
        const response = await api.post('/api/product-statuses', statusData)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }
        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[createProductStatus] Error:', error)
        throw error
    }
}

// Actualizar producto
export const updateProduct = async (productData) => {
    try {
        const response = await api.put('/api/products', productData)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }
        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[updateProduct] Error:', error)
        throw error
    }
}

// Actualizar estado de producto
export const updateProductStatus = async (statusData) => {
    try {
        const response = await api.put('/api/product-statuses', statusData)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }
        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[updateProductStatus] Error:', error)
        throw error
    }
}

// Eliminar estado de producto
export const deleteProductStatus = async (id) => {
    try {
        const response = await api.delete(`/api/product-statuses/${id}`)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }
        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[deleteProductStatus] Error:', error)
        throw error
    }
}

// Obtener estado de producto por ID
export const getProductStatusById = async (id) => {
    try {
        const response = await api.get(`/api/product-statuses/${id}`)
        return response.data
    } catch (error) {
        console.error('[getProductStatusById] Error:', error)
        throw error
    }
}

// ==================== MOVIMIENTOS DE STOCK ====================

// Obtener movimientos de stock
export const getStockMovements = async (page = 0, size = 10, stockCatalogueId = null, tipoMovimiento = null, fechaInicio = null, fechaFin = null) => {
    try {
        const response = await api.get('/api/stock-movements', {
            params: {
                page,
                size,
                stockCatalogueId,
                tipoMovimiento,
                fechaInicio,
                fechaFin,
            },
        })
        return response.data
    } catch (error) {
        console.error('[getStockMovements] Error:', error)
        throw error
    }
}
