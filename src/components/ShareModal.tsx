import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Image, ActivityIndicator, Alert } from 'react-native';
import { X, Search } from 'lucide-react-native';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import { API_URL } from '../config';

interface ShareModalProps {
    visible: boolean;
    onClose: () => void;
    post: {
        id: string;
        imageUrl: string;
        caption: string;
    } | null;
}

const ShareModal: React.FC<ShareModalProps> = ({ visible, onClose, post }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { token, user } = useAuth();
    const [sending, setSending] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            fetchData();
        }
    }, [visible]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [friendsRes, groupsRes] = await Promise.all([
                axios.get(`${API_URL}/api/friends/friends`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/api/groups/my-groups`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setUsers(friendsRes.data);
            setGroups(groupsRes.data);
        } catch (error) {
            console.error('Fetch Sharing Data Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async (receiverId: string | null, groupId: string | null) => {
        if (!post) return;
        const targetId = receiverId || groupId;
        setSending(targetId);
        try {
            const content = `POST_SHARE|${post.id}|${post.imageUrl}|${post.caption || ''}`;

            await axios.post(`${API_URL}/api/messages/send`, {
                receiverId,
                groupId,
                content
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert('Shared!', 'Post shared successfully.');
            onClose();
        } catch (error) {
            console.error('Share Error:', error);
            Alert.alert('Error', 'Failed to share post. Please try again.');
        } finally {
            setSending(null);
        }
    };

    const renderUser = ({ item }: any) => (
        <View style={styles.userItem}>
            <View style={styles.userInfo}>
                <Image
                    source={{ uri: item.avatar || 'https://via.placeholder.com/40' }}
                    style={styles.avatar}
                />
                <Text style={styles.username}>{item.username}</Text>
            </View>
            <TouchableOpacity
                style={styles.sendButton}
                onPress={() => item.isGroup ? handleShare(null, item.id) : handleShare(item.id, null)}
                disabled={sending === item.id}
            >
                {sending === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={styles.sendButtonText}>Send</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Send to</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X color="#333" size={24} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator style={styles.loader} color="#000" />
                    ) : (
                        <FlatList
                            data={[
                                ...(groups.length > 0 ? [{ id: 'h-g', isHeader: true, title: 'Groups' }, ...groups.map(g => ({ ...g, isGroup: true }))] : []),
                                { id: 'h-f', isHeader: true, title: 'Friends' },
                                ...users
                            ]}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }: any) => {
                                if (item.isHeader) return <Text style={styles.sectionHeader}>{item.title}</Text>;
                                return renderUser({ item });
                            }}
                            contentContainerStyle={styles.list}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '60%',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    loader: {
        marginTop: 50,
    },
    list: {
        paddingBottom: 20,
    },
    userItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#eee',
    },
    username: {
        fontSize: 16,
        fontWeight: '500',
    },
    sendButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        minWidth: 70,
        alignItems: 'center',
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        textTransform: 'uppercase',
        backgroundColor: '#f8f8f8',
        padding: 5,
        marginVertical: 10,
    }
});

export default ShareModal;
