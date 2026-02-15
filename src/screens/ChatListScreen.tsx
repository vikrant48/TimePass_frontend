import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import { API_URL } from '../config';
import { Users, UserPlus, Search } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

const ChatListScreen = ({ navigation }: any) => {
    const [users, setUsers] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [invites, setInvites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [globalUsers, setGlobalUsers] = useState<any[]>([]);
    const { token, user } = useAuth();
    const { theme } = useTheme();

    const fetchData = async () => {
        try {
            // Fetch Users
            const userResponse = await axios.get(`${API_URL}/api/auth/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const allUsers = userResponse.data.filter((u: any) => u.id !== user.id);

            const usersWithStatus = await Promise.all(allUsers.map(async (u: any) => {
                try {
                    const statusRes = await axios.get(`${API_URL}/api/friends/status/${u.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    return { ...u, connection: statusRes.data };
                } catch (err) {
                    return { ...u, connection: { status: 'NONE' } };
                }
            }));
            setUsers(usersWithStatus);

            // Fetch Groups
            const groupRes = await axios.get(`${API_URL}/api/groups/my-groups`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGroups(groupRes.data);

            // Fetch Invites
            const inviteRes = await axios.get(`${API_URL}/api/groups/invites`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInvites(inviteRes.data);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const unsubscribe = navigation.addListener('focus', () => {
            fetchData();
        });
        return unsubscribe;
    }, [navigation]);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length < 2) {
            setGlobalUsers([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await axios.get(`${API_URL}/api/auth/search`, {
                params: { query },
                headers: { Authorization: `Bearer ${token}` }
            });

            // Fetch connection status for search results
            const usersWithStatus = await Promise.all(res.data.map(async (u: any) => {
                try {
                    const statusRes = await axios.get(`${API_URL}/api/friends/status/${u.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    return { ...u, connection: statusRes.data };
                } catch (err) {
                    return { ...u, connection: { status: 'NONE' } };
                }
            }));

            // Filter out users already in the "users" list (friends/recent)
            const existingIds = users.map(u => u.id);
            const newcomers = usersWithStatus.filter(u => !existingIds.includes(u.id));
            setGlobalUsers(newcomers);
        } catch (error) {
            console.error('Global Search Error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddFriend = async (receiverId: string) => {
        try {
            await axios.post(`${API_URL}/api/friends/send`, { receiverId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert('Request Sent', 'Friend request sent successfully.');
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to send request');
        }
    };

    const handleInviteAction = async (groupId: string, status: 'ACCEPTED' | 'REJECTED') => {
        try {
            await axios.post(`${API_URL}/api/groups/respond`, { groupId, status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', 'Failed to respond to invitation');
        }
    };

    const renderUser = ({ item }: any) => {
        const status = item.connection.status;
        const canChat = status === 'ACCEPTED';
        const isPending = status === 'PENDING' || status === 'PENDING_RECEIVED';

        return (
            <View style={[styles.chatItem, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.id })}>
                    <Image
                        source={{ uri: item.avatar || 'https://via.placeholder.com/50' }}
                        style={[styles.avatar, { backgroundColor: theme.colors.background }]}
                    />
                </TouchableOpacity>
                <TouchableOpacity style={styles.chatInfo} onPress={() => navigation.navigate('UserProfile', { userId: item.id })}>
                    <Text style={[styles.username, { color: theme.colors.text }]}>{item.username}</Text>
                    {canChat ? (
                        <Text style={[styles.lastMessage, { color: theme.colors.subtext }]}>You are friends</Text>
                    ) : (
                        <Text style={[styles.lastMessage, { color: theme.colors.subtext }]}>
                            {status === 'PENDING' ? 'Request sent...' : status === 'PENDING_RECEIVED' ? 'Sent you a request' : 'Not connected'}
                        </Text>
                    )}
                </TouchableOpacity>

                {
                    canChat ? (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                            onPress={() => navigation.navigate('ChatDetail', { otherUser: item })}
                        >
                            <Text style={styles.actionText}>Message</Text>
                        </TouchableOpacity>
                    ) : isPending ? (
                        <View style={[styles.actionBtn, styles.disabledBtn, { backgroundColor: theme.colors.border }]}>
                            <Text style={[styles.disabledText, { color: theme.colors.subtext }]}>Pending</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.addBtn, { backgroundColor: theme.colors.accent }]}
                            onPress={() => handleAddFriend(item.id)}
                        >
                            <Text style={styles.actionText}>Add</Text>
                        </TouchableOpacity>
                    )
                }
            </View >
        );
    };

    const renderGroup = ({ item }: any) => (
        <TouchableOpacity
            style={[styles.chatItem, { borderBottomColor: theme.colors.border }]}
            onPress={() => navigation.navigate('ChatDetail', { group: item })}
        >
            <View style={[styles.avatar, styles.groupAvatar, { backgroundColor: theme.colors.background }]}>
                <Users color={theme.colors.subtext} size={30} />
            </View>
            <View style={styles.chatInfo}>
                <Text style={[styles.username, { color: theme.colors.text }]}>{item.name}</Text>
                <Text style={[styles.lastMessage, { color: theme.colors.subtext }]}>{item._count?.members || 0} members</Text>
            </View>
            <View style={[styles.groupBadge, { backgroundColor: theme.dark ? '#333' : '#E3F2FD' }]}>
                <Text style={[styles.groupBadgeText, { color: theme.dark ? '#CCC' : '#1976D2' }]}>Group</Text>
            </View>
        </TouchableOpacity>
    );

    const renderInvite = ({ item }: any) => (
        <View style={[styles.chatItem, styles.inviteItem, { borderBottomColor: theme.colors.border, backgroundColor: theme.dark ? '#2C2C14' : '#fff9c4' }]}>
            <View style={[styles.avatar, styles.groupAvatar, { backgroundColor: theme.colors.background }]}>
                <UserPlus color={theme.colors.subtext} size={24} />
            </View>
            <View style={styles.chatInfo}>
                <Text style={[styles.username, { color: theme.colors.text }]}>Invited to: {item.group.name}</Text>
                <View style={styles.inviteActions}>
                    <TouchableOpacity
                        style={[styles.smallBtn, styles.acceptBtn, { backgroundColor: theme.colors.accent }]}
                        onPress={() => handleInviteAction(item.groupId, 'ACCEPTED')}
                    >
                        <Text style={styles.btnText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.smallBtn, styles.rejectBtn, { backgroundColor: theme.colors.error || '#F44336' }]}
                        onPress={() => handleInviteAction(item.groupId, 'REJECTED')}
                    >
                        <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
                <Search color={theme.colors.subtext} size={20} />
                <TextInput
                    style={[styles.searchInput, { color: theme.colors.text }]}
                    placeholder="Search people or groups..."
                    placeholderTextColor={theme.colors.subtext}
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
                {isSearching && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: 10 }} />}
            </View>

            <TouchableOpacity
                style={[styles.createGroupBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('CreateGroup')}
            >
                <Users color="#fff" size={20} />
                <Text style={styles.createGroupText}>Create New Group</Text>
            </TouchableOpacity>

            <FlatList
                data={[
                    ...(invites.length > 0 ? [{ type: 'header', title: 'Group Invitations' }, ...invites.map(i => ({ ...i, isInvite: true }))] : []),
                    ...(filteredGroups.length > 0 ? [{ type: 'header', title: 'Your Groups' }, ...filteredGroups.map(g => ({ ...g, isGroup: true }))] : []),
                    ...(filteredUsers.length > 0 ? [{ type: 'header', title: 'Direct Messages' }, ...filteredUsers] : []),
                    ...(globalUsers.length > 0 ? [{ type: 'header', title: 'Global Results' }, ...globalUsers.map(u => ({ ...u, isGlobal: true }))] : [])
                ]}
                keyExtractor={(item, index) => item.id || `header-${index}`}
                renderItem={({ item }: any) => {
                    if (item.type === 'header') {
                        return (
                            <View style={[styles.sectionHeader, { backgroundColor: theme.dark ? '#1E1E1E' : '#f8f8f8' }]}>
                                <Text style={[styles.sectionHeaderLines, { color: theme.colors.subtext }]}>{item.title}</Text>
                            </View>
                        );
                    }
                    if (item.isInvite) return renderInvite({ item });
                    if (item.isGroup) return renderGroup({ item });
                    return renderUser({ item });
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        paddingVertical: 5,
    },
    chatItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, alignItems: 'center' },
    avatar: { width: 60, height: 60, borderRadius: 30 },
    chatInfo: { marginLeft: 16, flex: 1 },
    username: { fontSize: 18, fontWeight: 'bold' },
    lastMessage: { fontSize: 14, marginTop: 4 },
    actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    addBtn: {},
    disabledBtn: {},
    actionText: { color: '#fff', fontWeight: 'bold' },
    disabledText: { fontWeight: 'bold' },
    createGroupBtn: { flexDirection: 'row', padding: 12, margin: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    createGroupText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
    sectionHeader: { padding: 8, paddingHorizontal: 16 },
    sectionHeaderLines: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
    groupAvatar: { justifyContent: 'center', alignItems: 'center' },
    groupBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    groupBadgeText: { fontSize: 10, fontWeight: 'bold' },
    inviteItem: {},
    inviteActions: { flexDirection: 'row', marginTop: 8 },
    smallBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, marginRight: 8 },
    acceptBtn: { backgroundColor: '#4CAF50' },
    rejectBtn: { backgroundColor: '#F44336' },
    btnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});

export default ChatListScreen;
