import { Button, useTheme } from 'heroui-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'

const BackButton = () => {
    const navigation = useNavigation()
    const { colors } = useTheme()

    return (
        <Button isIconOnly className="bg-transparent shrink-0 size-12" onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back-outline" size={24} color={colors.foreground} />
        </Button>
    )
}

export default BackButton
