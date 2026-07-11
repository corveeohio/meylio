import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, type NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useUser } from '../context/UserContext';
import { resolveOnboardingRoute } from './resolveOnboardingRoute';
import { registerForPushNotifications } from '../services/pushNotifications';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { BiometricUnlockScreen } from '../screens/BiometricUnlockScreen';
import { VerifyCodeScreen } from '../screens/VerifyCodeScreen';
import { TermsScreen } from '../screens/TermsScreen';
import { ChooseUsernameScreen } from '../screens/ChooseUsernameScreen';
import { ChangeEmailScreen } from '../screens/ChangeEmailScreen';
import { ChangePhoneScreen } from '../screens/ChangePhoneScreen';
import { MusicConnectScreen } from '../screens/MusicConnectScreen';
import { ManualMusicTasteScreen } from '../screens/ManualMusicTasteScreen';
import { PhotosScreen } from '../screens/PhotosScreen';
import { SelfieVerificationScreen } from '../screens/SelfieVerificationScreen';
import { BasicInfoScreen } from '../screens/BasicInfoScreen';
import { MainTabNavigator, type MainTabParamList } from './MainTabNavigator';
import { PreMatchProfileScreen } from '../screens/PreMatchProfileScreen';
import { MatchScreen } from '../screens/MatchScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { IcebreakerQuizScreen } from '../screens/IcebreakerQuizScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { FiltersScreen } from '../screens/FiltersScreen';
import { MeylioLogo } from '../components/MeylioLogo';
import type { CompatibilityBreakdown } from '../types/compatibility';

export type RootStackParamList = {
  Onboarding: undefined;
  Login: { mode?: 'login' | 'signup' } | undefined;
  BiometricUnlock: undefined;
  VerifyCode: { email?: string; phone?: string };
  Terms: undefined;
  ChooseUsername: undefined;
  MusicConnect: undefined;
  ManualMusicTaste: undefined;
  Photos: undefined;
  SelfieVerification: undefined;
  BasicInfo: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Filters: undefined;
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
  Icebreaker: { matchId: string; otherUserId: string };
  ChangeEmail: undefined;
  ChangePhone: undefined;
  Subscription: undefined;
  Report: { reportedUserId: string };
  Help: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const {
    isLoading,
    userId,
    hasMusicProfile,
    hasDisplayName,
    hasPhotos,
    hasBasicInfo,
    hasAcceptedTerms,
    needsBiometricUnlock,
  } = useUser();

  useEffect(() => {
    if (userId) registerForPushNotifications(userId);
  }, [userId]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const initialRouteName = !userId
    ? 'Onboarding'
    : needsBiometricUnlock
      ? 'BiometricUnlock'
      : resolveOnboardingRoute({ hasAcceptedTerms, hasDisplayName, hasMusicProfile, hasPhotos, hasBasicInfo });

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
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
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={({ route }) => ({ title: route.params?.mode === 'signup' ? 'Inscription' : 'Connexion' })}
        />
        <Stack.Screen
          name="BiometricUnlock"
          component={BiometricUnlockScreen}
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} options={{ title: 'Vérification' }} />
        <Stack.Screen
          name="Terms"
          component={TermsScreen}
          options={{ title: 'Conditions', headerBackVisible: false, gestureEnabled: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="ChooseUsername"
          component={ChooseUsernameScreen}
          options={{ title: 'Ton pseudo', headerBackVisible: false, gestureEnabled: false, animation: 'fade' }}
        />
        <Stack.Screen name="MusicConnect" component={MusicConnectScreen} options={{ title: 'Musique' }} />
        <Stack.Screen name="ManualMusicTaste" component={ManualMusicTasteScreen} options={{ title: 'Tes goûts' }} />
        <Stack.Screen name="Photos" component={PhotosScreen} options={{ title: 'Photos' }} />
        <Stack.Screen name="SelfieVerification" component={SelfieVerificationScreen} options={{ title: 'Vérification' }} />
        <Stack.Screen
          name="BasicInfo"
          component={BasicInfoScreen}
          options={{ title: 'Ton profil', headerBackVisible: false, gestureEnabled: false, animation: 'fade' }}
        />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="Filters" component={FiltersScreen} options={{ title: 'Filtres', presentation: 'modal' }} />
        <Stack.Screen name="PreMatchProfile" component={PreMatchProfileScreen} options={{ title: 'Profil' }} />
        <Stack.Screen name="Match" component={MatchScreen} options={{ title: 'Match' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
        <Stack.Screen name="Icebreaker" component={IcebreakerQuizScreen} options={{ title: 'Icebreaker' }} />
        <Stack.Screen
          name="ChangeEmail"
          component={ChangeEmailScreen}
          options={{ title: 'Changer d’email', presentation: 'modal' }}
        />
        <Stack.Screen
          name="ChangePhone"
          component={ChangePhoneScreen}
          options={{ title: 'Téléphone', presentation: 'modal' }}
        />
        <Stack.Screen
          name="Subscription"
          component={SubscriptionScreen}
          options={{ title: 'Premium', presentation: 'modal' }}
        />
        <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Signaler', presentation: 'modal' }} />
        <Stack.Screen name="Help" component={HelpScreen} options={{ title: 'Aide', presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
