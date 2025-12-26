import { CalendarDateTime } from '@internationalized/date'

export function formatDateLiteral(isoString, withTime = false) {
    if (isoString === null || isoString === undefined || isoString === '') {
        return 'Sin modificar aún'
    }

    const date = new Date(isoString)

    const day = String(date.getDate()).padStart(2, '0')
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()

    let result = `${day} de ${month} del ${year}`

    if (withTime) {
        let hours = date.getHours() % 12
        if (hours === 0) hours = 12
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const ampm = date.getHours() < 12 ? 'AM' : 'PM'

        result += ` a las ${hours}:${minutes} ${ampm}`
    }

    return result
}

export function parseISOToCalendarDateTime(iso) {
    if (!iso) return null

    const clean = iso.endsWith('Z') ? iso.slice(0, -1) : iso

    const [datePart, timePart] = clean.split('T')
    const [year, month, day] = datePart.split('-').map(Number)

    let hour = 0,
        minute = 0,
        second = 0

    if (timePart) {
        const timeParts = timePart.split(':')
        hour = timeParts[0] ? Number(timeParts[0]) : 0
        minute = timeParts[1] ? Number(timeParts[1]) : 0

        if (timeParts[2]) {
            second = parseInt(timeParts[2], 10)
            if (isNaN(second)) second = 0
        }
    }

    const datetime = new CalendarDateTime(year, month, day, hour, minute, second)
    return datetime
}

export function calendarDateTimeToISO(datetime) {
    if (!datetime) return null
    return `${datetime.year}-${datetime.month.toString().padStart(2, '0')}-${datetime.day.toString().padStart(2, '0')}T${datetime.hour.toString().padStart(2, '0')}:${datetime.minute.toString().padStart(2, '0')}:${datetime.second.toString().padStart(2, '0')}`
}

// Formatea una fecha en formato 12/DIC/2025
export function formatDateShort(isoString) {
    if (!isoString || isoString === '') return ''

    const date = new Date(isoString)
    const day = String(date.getDate()).padStart(2, '0')
    const monthAbbr = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
    const month = monthAbbr[date.getMonth()]
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
}

// Convierte una fecha YYYY-MM-DD a formato 12/DIC/2025
export function formatDateStringToShort(dateString) {
    if (!dateString || dateString === '') return ''

    const [year, month, day] = dateString.split('-').map(Number)
    const monthAbbr = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

    return `${String(day).padStart(2, '0')}/${monthAbbr[month - 1]}/${year}`
}

// Convierte un objeto Date a formato YYYY-MM-DD usando la zona horaria local (evita problemas de UTC)
export function formatDateToLocalString(date) {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}
