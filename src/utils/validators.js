// ==========================================
// VALIDACIONES GENERALES
// ==========================================

export function required(value) {
    // Verifica null, undefined, o string vacío/solo espacios
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
        return 'El campo es obligatorio.'
    }
    return null
}

export function requiredNumber(value) {
    if (value === null || value === undefined || value === '') {
        return 'El campo es obligatorio.'
    }
    // Convierte a número y verifica si es válido
    const num = Number(value)
    if (Number.isNaN(num)) {
        return 'El campo debe ser un número válido.'
    }
    return null
}

export function noSpaces(value) {
    if (value && /\s/.test(value)) {
        return 'El campo no puede contener espacios.'
    }
    return null
}

// ==========================================
// VALIDACIONES DE FORMATO
// ==========================================

// MEJORADA: Validación menos estricta (RFC 5322 simplificado)
// Solo verifica: algo + @ + algo + . + algo
export function validEmail(value) {
    const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (value && !simpleEmailRegex.test(value)) {
        return 'Introduce un correo electrónico válido.'
    }
    return null
}

export function validPassword(value) {
    // Mínimo 8 caracteres, 1 minúscula, 1 mayúscula, 1 número, 1 especial
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/

    if (value && !passwordRegex.test(value)) {
        return 'La contraseña debe tener 8+ caracteres, una mayúscula, una minúscula, un número y un símbolo.'
    }
    if (value && /\s/.test(value)) {
        return 'La contraseña no puede tener espacios.'
    }
    return null
}

export function onlyLetters(value) {
    // \p{L} soporta cualquier letra de cualquier idioma (tildes, ñ, etc.)
    // Permite espacios entre palabras, pero no al inicio/final
    const lettersRegex = /^\p{L}+(?:\s\p{L}+)*$/u

    if (value && !lettersRegex.test(value)) {
        return 'Solo se permiten letras (sin números ni símbolos).'
    }
    return null
}

export function validPhone(value) {
    if (!value) return null // Si es opcional y está vacío, pasa.

    // Acepta exactamente 10 dígitos
    if (!/^[0-9]{10}$/.test(value)) {
        return 'Ingresa un número de 10 dígitos válido.'
    }
    return null
}

export function validRoleId(value) {
    // Verifica que sea un número entero positivo (string o number)
    if (value !== null && value !== undefined && !/^\d+$/.test(String(value))) {
        return 'Selecciona un rol válido.'
    }
    return null
}

export function isValidUUID(token) {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    return uuidRegex.test(token)
}

// ==========================================
// VALIDACIONES DE FECHA
// ==========================================

export function validateDatePicker(value) {
    if (!value) return 'La fecha es obligatoria.'

    try {
        // Asumiendo que 'value' viene de una librería como react-native-calendars
        // value = { year: 2024, month: 1, day: 15, ... }

        const year = value.year
        const month = value.month - 1 // JS months 0-11
        const day = value.day

        // Crear fechas usando UTC para evitar problemas de zona horaria local
        const selectedDate = new Date(Date.UTC(year, month, day))

        const now = new Date()
        // Normalizar "hoy" a medianoche UTC para comparación justa
        const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

        // Fecha máxima (Problema del año 2038)
        const maxDate = new Date(Date.UTC(2038, 0, 19))

        if (selectedDate < todayUTC) {
            return 'La fecha debe ser a partir de mañana.'
        }

        if (selectedDate > maxDate) {
            return 'La fecha excede el límite permitido (año 2038).'
        }
    } catch (error) {
        return 'Fecha inválida.'
    }

    return null
}

// Validador para números positivos
export function validPositiveNumber(value) {
    if (value === null || value === '') {
        return
    }

    const numValue = Number(value)

    if (isNaN(numValue)) {
        return 'Debe ser un número válido.'
    }

    if (numValue <= 0) {
        return 'Debe ser un número positivo mayor a 0.'
    }

    if (!Number.isInteger(numValue)) {
        return 'Debe ser un número entero.'
    }
}

// Validador para fechas
export function validDate(value) {
    if (value === null || value === '') {
        return 'La fecha es obligatoria.'
    }

    // Formato YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/

    if (!dateRegex.test(value)) {
        return 'Formato de fecha inválido. Use YYYY-MM-DD.'
    }

    const date = new Date(value)

    if (isNaN(date.getTime())) {
        return 'Fecha inválida.'
    }
}

// Validador para fecha de caducidad (debe ser posterior a hoy)
export function validExpirationDate(value) {
    if (value === null || value === '') {
        return 'La fecha de caducidad es obligatoria.'
    }

    const dateError = validDate(value)
    if (dateError) return dateError

    const inputDate = new Date(value)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (inputDate < today) {
        return 'La fecha de caducidad debe ser posterior a hoy.'
    }
}

export const minLength = (min) => (value) => {
    if (!value || value.length < min) {
        return `Debe tener al menos ${min} caracteres`
    }
    return null
}
