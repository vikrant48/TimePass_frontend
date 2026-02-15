import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import { API_URL } from '../config';
import { Users, UserPlus } from 'lucide-react-native';

const ChatListScreen = ({ navigation }: any) => {
    const [users, setUsers] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [invites, setInvites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { token, user } = useAuth();

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
            <View style={styles.chatItem}>
                <Image
                    source={{ uri: item.avatar || 'https://via.placeholder.com/50' }}
                    style={styles.avatar}
                />
                <View style={styles.chatInfo}>
                    <Text style={styles.username}>{item.username}</Text>
                    {canChat ? (
                        <Text style={styles.lastMessage}>You are friends</Text>
                    ) : (
                        <Text style={styles.lastMessage}>
                            {status === 'PENDING' ? 'Request sent...' : status === 'PENDING_RECEIVED' ? 'Sent you a request' : 'Not connected'}
                        </Text>
                    )}
                </View>

                {canChat ? (
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('ChatDetail', { otherUser: item })}
                    >
                        <Text style={styles.actionText}>Message</Text>
                    </TouchableOpacity>
                ) : isPending ? (
                    <View style={[styles.actionBtn, styles.disabledBtn]}>
                        <Text style={styles.disabledText}>Pending</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.addBtn]}
                        onPress={() => handleAddFriend(item.id)}
                    >
                        <Text style={styles.actionText}>Add</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderGroup = ({ item }: any) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => navigation.navigate('ChatDetail', { group: item })}
        >
            <View style={[styles.avatar, styles.groupAvatar]}>
                <Users color="#666" size={30} />
            </View>
            <View style={styles.chatInfo}>
                <Text style={styles.username}>{item.name}</Text>
                <Text style={styles.lastMessage}>{item._count?.members || 0} members</Text>
            </View>
            <View style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>Group</Text>
            </View>
        </TouchableOpacity>
    );

    const renderInvite = ({ item }: any) => (
        <View style={[styles.chatItem, styles.inviteItem]}>
            <View style={[styles.avatar, styles.groupAvatar]}>
                <UserPlus color="#666" size={24} />
            </View>
            <View style={styles.chatInfo}>
                <Text style={styles.username}>Invited to: {item.group.name}</Text>
                <View style={styles.inviteActions}>
                    <TouchableOpacity
                        style={[styles.smallBtn, styles.acceptBtn]}
                        onPress={() => handleInviteAction(item.groupId, 'ACCEPTED')}
                    >
                        <Text style={styles.btnText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.smallBtn, styles.rejectBtn]}
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
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.createGroupBtn}
                onPress={() => navigation.navigate('CreateGroup')}
            >
                <Users color="#fff" size={20} />
                <Text style={styles.createGroupText}>Create New Group</Text>
            </TouchableOpacity>

            <FlatList
                data={[
                    ...(invites.length > 0 ? [{ type: 'header', title: 'Group Invitations' }, ...invites.map(i => ({ ...i, isInvite: true }))] : []),
                    ...(groups.length > 0 ? [{ type: 'header', title: 'Your Groups' }, ...groups.map(g => ({ ...g, isGroup: true }))] : []),
                    { type: 'header', title: 'Direct Messages' },
                    ...users
                ]}
                keyExtractor={(item, index) => item.id || `header-${index}`}
                renderItem={({ item }: any) => {
                    if (item.type === 'header') {
                        return <Text style={styles.sectionHeader}>{item.title}</Text>;
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
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    chatItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#eee' },
    chatInfo: { marginLeft: 16, flex: 1 },
    username: { fontSize: 18, fontWeight: 'bold' },
    lastMessage: { fontSize: 14, color: '#888', marginTop: 4 },
    actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#007AFF' },
    addBtn: { backgroundColor: '#4CAF50' },
    disabledBtn: { backgroundColor: '#f0f0f0' },
    actionText: { color: '#fff', fontWeight: 'bold' },
    disabledText: { color: '#888' },
    createGroupBtn: { flexDirection: 'row', backgroundColor: '#000', padding: 12, margin: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    createGroupText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
    sectionHeader: { backgroundColor: '#f8f8f8', padding: 8, paddingHorizontal: 16, fontSize: 12, fontWeight: 'bold', color: '#666', textTransform: 'uppercase' },
    groupAvatar: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
    groupBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    groupBadgeText: { fontSize: 10, color: '#1976D2', fontWeight: 'bold' },
    inviteItem: { backgroundColor: '#fff9c4' },
    inviteActions: { flexDirection: 'row', marginTop: 8 },
    smallBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, marginRight: 8 },
    acceptBtn: { backgroundColor: '#4CAF50' },
    rejectBtn: { backgroundColor: '#F44336' },
    btnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});

export default ChatListScreen;
