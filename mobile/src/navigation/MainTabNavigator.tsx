import { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { DiscoveryFeedScreen } from '../screens/DiscoveryFeedScreen';
import { ProximityFeedScreen } from '../screens/ProximityFeedScreen';
import { MatchesListScreen } from '../screens/MatchesListScreen';
import { LikesReceivedScreen } from '../screens/LikesReceivedScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type MainTabParamList = {
  Discovery: undefined;
  Proximity: undefined;
  Matches: undefined;
  Likes: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Discovery: 'disc',
  Proximity: 'navigate',
  Matches: 'chatbubbles',
  Likes: 'heart',
  Settings: 'person',
};

export function MainTabNavigator() {
  const { userId } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    function poll() {
      fetch(`${API_BASE_URL}/matches?userId=${userId}`)
        .then((response) => response.json())
        .then((data) => {
          if (cancelled || !Array.isArray(data)) return;
          const total = data.reduce((sum: number, match: { unreadCount: number }) => sum + match.unreadCount, 0);
          setUnreadCount(total);
        })
        .catch(() => {});
    }

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? ICONS[route.name as keyof MainTabParamList] : (`${ICONS[route.name as keyof MainTabParamList]}-outline` as keyof typeof Ionicons.glyphMap)}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Discovery" component={DiscoveryFeedScreen} options={{ title: 'Découverte' }} />
      <Tab.Screen name="Proximity" component={ProximityFeedScreen} options={{ title: 'Proximité' }} />
      <Tab.Screen
        name="Matches"
        component={MatchesListScreen}
        options={{
          title: 'Messages',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.text, fontSize: 11 },
        }}
      />
      <Tab.Screen name="Likes" component={LikesReceivedScreen} options={{ title: 'Likes' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}
