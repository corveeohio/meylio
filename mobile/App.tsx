import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AppleMusicAuthProvider } from '@superfan-app/apple-music-auth';
import { RootNavigator } from './src/navigation/RootNavigator';
import { UserProvider } from './src/context/UserContext';
import { FiltersProvider } from './src/context/FiltersContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppleMusicAuthProvider>
        <UserProvider>
          <FiltersProvider>
            <RootNavigator />
            <StatusBar style="light" />
          </FiltersProvider>
        </UserProvider>
      </AppleMusicAuthProvider>
    </GestureHandlerRootView>
  );
}
