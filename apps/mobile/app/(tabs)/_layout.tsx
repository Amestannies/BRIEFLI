import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

const PRIMARY = '#3B4ECC';
const NAVY = '#121845';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: '#8A9AC0',
        tabBarStyle: {
          backgroundColor: NAVY,
          borderTopColor: '#1e2d6b',
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <Feather name="grid" size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="cases/index"
        options={{ title: 'Cases', tabBarIcon: ({ color }) => <Feather name="briefcase" size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendar', tabBarIcon: ({ color }) => <Feather name="calendar" size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="clients"
        options={{ title: 'Clients', tabBarIcon: ({ color }) => <Feather name="users" size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="clients/[id]/index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="billing"
        options={{ title: 'Billing', tabBarIcon: ({ color }) => <Feather name="dollar-sign" size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="documents"
        options={{ title: 'Documents', tabBarIcon: ({ color }) => <Feather name="folder" size={20} color={color} /> }}
      />
    </Tabs>
  );
}
