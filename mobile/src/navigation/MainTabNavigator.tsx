import { useCallback, useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { promptForUpdateIfNeeded } from '../utils/updateCheck';
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
  const [pendingLikes, setPendingLikes] = useState(0);

  const pollUnread = useCallback(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/matches?userId=${userId}`)
      .then((response) => response.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setUnreadCount(data.reduce((sum: number, match: { unreadCount: number }) => sum + match.unreadCount, 0));
      })
      .catch(() => {});
  }, [userId]);

  const pollLikes = useCallback(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/matches/likes-count?userId=${userId}`)
      .then((response) => response.json())
      .then((data) => typeof data.count === 'number' && setPendingLikes(data.count))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    pollUnread();
    pollLikes();
    const unreadInterval = setInterval(pollUnread, 5000);
    const likesInterval = setInterval(pollLikes, 20000);
    return () => {
      clearInterval(unreadInterval);
      clearInterval(likesInterval);
    };
  }, [pollUnread, pollLikes]);

  // Once per launch, once the person is inside the app.
  useEffect(() => {
    promptForUpdateIfNeeded();
  }, []);

  // The home screen icon shows the same total as the tab badges.
  useEffect(() => {
    Notifications.setBadgeCountAsync(unreadCount + pendingLikes).catch(() => {});
  }, [unreadCount, pendingLikes]);

  return (
    <Tab.Navigator
      // Switching tabs refreshes the badges right away (a like back or a read conversation).
      screenListeners={{ tabPress: () => { pollUnread(); pollLikes(); } }}
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
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.text, fontSize: 11 },
        }}
      />
      <Tab.Screen
        name="Likes"
        component={LikesReceivedScreen}
        options={{
          title: 'Likes',
          tabBarBadge: pendingLikes > 0 ? (pendingLikes > 99 ? '99+' : pendingLikes) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.text, fontSize: 11 },
        }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}
