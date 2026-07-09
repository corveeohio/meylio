import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { MusicConnectScreen } from '../screens/MusicConnectScreen';
import { ManualMusicTasteScreen } from '../screens/ManualMusicTasteScreen';
import { PhotosScreen } from '../screens/PhotosScreen';
import { SelfieVerificationScreen } from '../screens/SelfieVerificationScreen';
import { DiscoveryFeedScreen } from '../screens/DiscoveryFeedScreen';
import { ProximityFeedScreen } from '../screens/ProximityFeedScreen';
import { PreMatchProfileScreen } from '../screens/PreMatchProfileScreen';
import { MatchScreen } from '../screens/MatchScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { MeylioLogo } from '../components/MeylioLogo';
import type { CompatibilityBreakdown } from '../types/compatibility';

export type RootStackParamList = {
  Onboarding: undefined;
  MusicConnect: undefined;
  ManualMusicTaste: undefined;
  Photos: undefined;
  SelfieVerification: undefined;
  DiscoveryFeed: undefined;
  ProximityFeed: undefined;
  PreMatchProfile:
    | { targetUserId: string; score: number; breakdown: CompatibilityBreakdown }
    | undefined;
  Match:
    | {
        matchId: string;
        otherUserId: string;
        score: number;
        breakdown: CompatibilityBreakdown;
        playlist: string[];
        icebreaker: string;
      }
    | undefined;
  Chat: { matchId: string; otherUserId: string } | undefined;
  Settings: undefined;
  Subscription: undefined;
  Report: { reportedUserId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerTitle: () => <MeylioLogo size={26} /> }}
        />
        <Stack.Screen name="MusicConnect" component={MusicConnectScreen} options={{ title: 'Musique' }} />
        <Stack.Screen name="ManualMusicTaste" component={ManualMusicTasteScreen} options={{ title: 'Tes goûts' }} />
        <Stack.Screen name="Photos" component={PhotosScreen} options={{ title: 'Photos' }} />
        <Stack.Screen name="SelfieVerification" component={SelfieVerificationScreen} options={{ title: 'Vérification' }} />
        <Stack.Screen name="DiscoveryFeed" component={DiscoveryFeedScreen} options={{ title: 'Découverte' }} />
        <Stack.Screen name="ProximityFeed" component={ProximityFeedScreen} options={{ title: 'À proximité' }} />
        <Stack.Screen name="PreMatchProfile" component={PreMatchProfileScreen} options={{ title: 'Profil' }} />
        <Stack.Screen name="Match" component={MatchScreen} options={{ title: 'Match' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Paramètres' }} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Premium' }} />
        <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Signaler' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
