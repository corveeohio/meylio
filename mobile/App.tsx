import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { UserProvider } from './src/context/UserContext';
import { FiltersProvider } from './src/context/FiltersContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        <FiltersProvider>
          <RootNavigator />
          <StatusBar style="light" />
        </FiltersProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}
