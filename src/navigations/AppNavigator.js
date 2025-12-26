import { useAuth } from '../contexts/AuthContext'
import AdminTabNavigator from './AdminTabNavigator'
import UserTabNavigator from './UserTabNavigator'

const AppNavigator = () => {
    const { userRole } = useAuth()

    // El botón de Logout debería ir en una pantalla (ej. Settings o Home)
    // const { logout } = useAuth();
    // <Button title="Logout" onPress={logout} />

    switch (userRole) {
        case 'ADMIN':
            return <AdminTabNavigator />
        case 'USER':
            return <UserTabNavigator />
        default:
            // Fallback por si el rol es null o no reconocido
            // (Aunque RootNavigator no debería dejarte llegar aquí sin rol)
            return <UserTabNavigator />
    }
}

export default AppNavigator
