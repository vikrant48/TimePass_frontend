import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import { API_URL } from '../config';
import { Check, X } from 'lucide-react-native';

const CreateGroupScreen = ({ navigation }: any) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [friends, setFriends] = useState<any[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const { token } = useAuth();

    useEffect(() => {
        fetchFriends();
    }, []);

    const fetchFriends = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/friends/friends`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFriends(response.data);
        } catch (error) {
            console.error('Error fetching friends:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleMember = (id: string) => {
        if (selectedMemberIds.includes(id)) {
            setSelectedMemberIds(prev => prev.filter(mid => mid !== id));
        } else {
            setSelectedMemberIds(prev => [...prev, id]);
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Group name is required');
            return;
        }

        setCreating(true);
        try {
            await axios.post(`${API_URL}/api/groups/create`, {
                name,
                description,
                memberIds: selectedMemberIds
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert('Success', 'Group created successfully!');
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to create group');
        } finally {
            setCreating(false);
        }
    };

    const renderFriend = ({ item }: any) => {
        const isSelected = selectedMemberIds.includes(item.id);
        return (
            <TouchableOpacity
                style={[styles.friendItem, isSelected && styles.selectedFriend]}
                onPress={() => toggleMember(item.id)}
            >
                <Image source={{ uri: item.avatar || 'https://via.placeholder.com/40' }} style={styles.avatar} />
                <Text style={styles.username}>{item.username}</Text>
                <View style={styles.checkbox}>
                    {isSelected && <Check color="#fff" size={16} />}
                </View>
            </TouchableOpacity>
        );
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
            <View style={styles.header}>
                <TextInput
                    style={styles.input}
                    placeholder="Group Name"
                    value={name}
                    onChangeText={setName}
                />
                <TextInput
                    style={[styles.input, styles.bioInput]}
                    placeholder="Description (Optional)"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                />
            </View>

            <Text style={styles.sectionTitle}>Invite Friends ({selectedMemberIds.length} selected)</Text>

            <FlatList
                data={friends}
                keyExtractor={(item) => item.id}
                renderItem={renderFriend}
                ListEmptyComponent={<Text style={styles.emptyText}>No friends to invite</Text>}
            />

            <TouchableOpacity
                style={[styles.createBtn, !name && styles.disabledBtn]}
                onPress={handleCreate}
                disabled={creating || !name}
            >
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Group</Text>}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { marginBottom: 20 },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingVertical: 10,
        fontSize: 18,
        marginBottom: 10,
    },
    bioInput: { fontSize: 14, minHeight: 60 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginVertical: 10, color: '#666' },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    selectedFriend: { backgroundColor: '#f0faff' },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    username: { flex: 1, fontSize: 16 },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent'
    },
    createBtn: {
        backgroundColor: '#000',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    disabledBtn: { backgroundColor: '#ccc' },
    btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
});

export default CreateGroupScreen;
