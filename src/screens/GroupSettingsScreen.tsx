import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import { API_URL } from '../config';
import { Save, UserMinus, ShieldCheck } from 'lucide-react-native';

const GroupSettingsScreen = ({ route, navigation }: any) => {
    const { groupId } = route.params;
    const [group, setGroup] = useState<any>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { token, user } = useAuth();

    useEffect(() => {
        fetchGroupDetails();
    }, []);

    const fetchGroupDetails = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/groups/${groupId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGroup(response.data);
            setName(response.data.name);
            setDescription(response.data.description || '');
        } catch (error) {
            console.error('Error fetching group details:', error);
            Alert.alert('Error', 'Failed to load group settings');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        setSaving(true);
        try {
            await axios.put(`${API_URL}/api/groups/${groupId}`, { name, description }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert('Success', 'Group updated successfully');
            fetchGroupDetails();
        } catch (error) {
            Alert.alert('Error', 'Failed to update group');
        } finally {
            setSaving(false);
        }
    };

    const handleManageMember = async (userId: string, action: 'REMOVE' | 'MAKE_ADMIN') => {
        try {
            await axios.post(`${API_URL}/api/groups/manage-member`, { groupId, userId, action }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert('Success', action === 'REMOVE' ? 'Member removed' : 'Member promoted');
            fetchGroupDetails();
        } catch (error) {
            Alert.alert('Error', 'Action failed');
        }
    };

    const isAdmin = group?.adminId === user.id;

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.label}>Group Name</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    editable={isAdmin}
                />
                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, styles.bioInput]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    editable={isAdmin}
                />
                {isAdmin && (
                    <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={saving}>
                        <Save color="#fff" size={20} />
                        <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Members ({group?.members?.length})</Text>
                {group?.members.map((member: any) => (
                    <View key={member.userId} style={styles.memberItem}>
                        <Image source={{ uri: member.user.avatar || 'https://via.placeholder.com/40' }} style={styles.avatar} />
                        <View style={styles.memberInfo}>
                            <Text style={styles.username}>{member.user.username}</Text>
                            {member.isAdmin && (
                                <View style={styles.adminBadge}>
                                    <ShieldCheck color="#4CAF50" size={12} />
                                    <Text style={styles.adminText}>Admin</Text>
                                </View>
                            )}
                        </View>
                        {isAdmin && member.userId !== user.id && (
                            <View style={styles.memberActions}>
                                {!member.isAdmin && (
                                    <TouchableOpacity style={styles.actionIcon} onPress={() => handleManageMember(member.userId, 'MAKE_ADMIN')}>
                                        <ShieldCheck color="#007AFF" size={20} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity style={styles.actionIcon} onPress={() => handleManageMember(member.userId, 'REMOVE')}>
                                    <UserMinus color="#F44336" size={20} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    section: { backgroundColor: '#fff', padding: 16, marginBottom: 10 },
    label: { fontSize: 12, color: '#666', marginBottom: 4, textTransform: 'uppercase' },
    input: { borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 8, fontSize: 16, marginBottom: 16 },
    bioInput: { minHeight: 60 },
    saveBtn: { flexDirection: 'row', backgroundColor: '#000', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    saveText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    memberItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    memberInfo: { flex: 1 },
    username: { fontSize: 16, fontWeight: '500' },
    adminBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    adminText: { fontSize: 10, color: '#4CAF50', marginLeft: 4, fontWeight: 'bold' },
    memberActions: { flexDirection: 'row' },
    actionIcon: { marginLeft: 16 },
});

export default GroupSettingsScreen;
