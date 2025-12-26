import { api } from './config/api'

export const getUsersRequest = async () => {
    try {
        const response = await api.get('/api/users/ButMe')
        return response.data
    } catch (error) {
        console.error('[getUsersRequest] Error en la solicitud de usuarios:', error.response?.data || error.message)
        throw error
    }
}

export const getProfile = async () => {
    try {
        const response = await api.get('/api/users/profile')

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }

        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[getProfile] error:', error)
        throw error
    }
}

export const createUser = async (user) => {
    try {
        const response = await api.post('/api/users', user)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }

        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[createUser] error:', error)
        throw error
    }
}

export const updateUser = async (user) => {
    try {
        const response = await api.put('/api/users', user)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }

        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[updateUser] error:', error)
        throw error
    }
}

export const updateProfile = async (user) => {
    try {
        const response = await api.put('/api/users/profile', user)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }

        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[updateProfile] error:', error)
        throw error
    }
}

export const changeStatus = async (email) => {
    try {
        const response = await api.delete(`/api/users/${email}`)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }

        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[changeStatus] error:', error)
        throw error
    }
}

export const changePassword = async (passwords) => {
    try {
        const response = await api.post('/api/users/change-password', passwords)

        if (response.status >= 200 && response.status < 300) {
            return response.data
        }

        throw new Error(`Código de estado inesperado: ${response.status}`)
    } catch (error) {
        console.error('[changePassword] error:', error)
        throw error
    }
}
