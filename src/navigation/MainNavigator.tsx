import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, MessageCircle, LogOut, User as UserIcon } from 'lucide-react-native';
import { ActivityIndicator, View, TouchableOpacity, Text } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FriendRequestsScreen from '../screens/FriendRequestsScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupSettingsScreen from '../screens/GroupSettingsScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import { useAuth } from '../store/AuthContext';
import { Bell } from 'lucide-react-native';
import io from 'socket.io-client';
import axios from 'axios';
import { API_URL } from '../config';
import { useTheme } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
    const { logout, user, token } = useAuth();
    const { theme } = useTheme();
    const [requestCount, setRequestCount] = React.useState(0);
    const socketRef = React.useRef<any>(null);

    React.useEffect(() => {
        const fetchRequests = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/friends/requests`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRequestCount(response.data.length);
            } catch (error) {
                console.error('Error fetching request count:', error);
            }
        };

        if (user) {
            fetchRequests();

            socketRef.current = io(API_URL);
            socketRef.current.emit('join', user.id);

            socketRef.current.on('newFriendRequest', () => {
                setRequestCount(prev => prev + 1);
            });

            return () => {
                if (socketRef.current) {
                    socketRef.current.disconnect();
                }
            };
        }
    }, [user, token]);

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.subtext,
                headerShown: true,
                headerStyle: { backgroundColor: theme.colors.card },
                headerTintColor: theme.colors.text,
                tabBarStyle: { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                    headerTitle: 'TimePass',
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={logout}
                            style={{ marginRight: 15, flexDirection: 'row', alignItems: 'center' }}
                        >
                            <LogOut color={theme.colors.notification} size={20} />
                            <Text style={{ color: theme.colors.notification, marginLeft: 5, fontWeight: '600' }}>Log Out</Text>
                        </TouchableOpacity>
                    ),
                }}
            />
            <Tab.Screen
                name="ChatsTab"
                component={ChatListScreen}
                options={({ navigation }) => ({
                    tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
                    headerTitle: 'Messages',
                    tabBarLabel: 'Chats',
                    headerRight: () => (
                        <TouchableOpacity
                            style={{ marginRight: 15 }}
                            onPress={() => {
                                setRequestCount(0);
                                navigation.navigate('FriendRequests');
                            }}
                        >
                            <View>
                                <Bell color={theme.colors.text} size={24} />
                                {requestCount > 0 && (
                                    <View style={{
                                        position: 'absolute',
                                        right: -2,
                                        top: -2,
                                        backgroundColor: theme.colors.notification,
                                        borderRadius: 6,
                                        width: 12,
                                        height: 12,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderWidth: 2,
                                        borderColor: theme.colors.card
                                    }} />
                                )}
                            </View>
                        </TouchableOpacity>
                    )
                })}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} />,
                    headerTitle: 'My Profile',
                }}
            />
        </Tab.Navigator>
    );
};

const MainNavigator = () => {
    const { user, isLoading } = useAuth();
    const { theme } = useTheme();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: true,
            }}
        >
            {user ? (
                <>
                    <Stack.Screen
                        name="Main"
                        component={TabNavigator}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="ChatDetail"
                        component={ChatDetailScreen}
                        options={({ route }: any) => ({
                            title: route.params?.otherUser?.username || 'Chat',
                        })}
                    />
                    <Stack.Screen
                        name="FriendRequests"
                        component={FriendRequestsScreen}
                        options={{ title: 'Friend Requests' }}
                    />
                    <Stack.Screen
                        name="CreateGroup"
                        component={CreateGroupScreen}
                        options={{ title: 'Create Group' }}
                    />
                    <Stack.Screen
                        name="GroupSettings"
                        component={GroupSettingsScreen}
                        options={{ title: 'Group Settings' }}
                    />
                    <Stack.Screen
                        name="UserProfile"
                        component={UserProfileScreen}
                        options={{ title: 'Profile' }}
                    />
                </>
            ) : (
                <>
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Register"
                        component={RegisterScreen}
                        options={{ headerShown: false }}
                    />
                </>
            )}
        </Stack.Navigator>
    );
};

export default MainNavigator;
