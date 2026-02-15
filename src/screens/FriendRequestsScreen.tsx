import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import { API_URL } from '../config';
import { Check, X } from 'lucide-react-native';

const FriendRequestsScreen = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    const fetchRequests = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/friends/requests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(response.data);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleRespond = async (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
        try {
            await axios.post(`${API_URL}/api/friends/respond`, {
                requestId,
                status
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert(status === 'ACCEPTED' ? 'Accepted!' : 'Rejected',
                status === 'ACCEPTED' ? 'You can now chat with this user.' : 'Request rejected.');

            // Remove from list
            setRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (error) {
            console.error('Response error:', error);
            Alert.alert('Error', 'Failed to update request.');
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {requests.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>No pending requests</Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.requestItem}>
                            <Image
                                source={{ uri: item.sender.avatar || 'https://via.placeholder.com/50' }}
                                style={styles.avatar}
                            />
                            <View style={styles.info}>
                                <Text style={styles.username}>{item.sender.username}</Text>
                                <Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                            </View>
                            <View style={styles.actions}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.acceptBtn]}
                                    onPress={() => handleRespond(item.id, 'ACCEPTED')}
                                >
                                    <Check color="#fff" size={20} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.rejectBtn]}
                                    onPress={() => handleRespond(item.id, 'REJECTED')}
                                >
                                    <X color="#fff" size={20} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    requestItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    info: {
        marginLeft: 16,
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    time: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
    },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    acceptBtn: {
        backgroundColor: '#4CAF50',
    },
    rejectBtn: {
        backgroundColor: '#F44336',
    },
    emptyText: {
        fontSize: 16,
        color: '#888',
    },
});

export default FriendRequestsScreen;
