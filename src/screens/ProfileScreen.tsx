import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import { API_URL } from '../config';
import { Camera, User as UserIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

const DEMO_AVATARS = [
    'https://i.pravatar.cc/150?u=1',
    'https://i.pravatar.cc/150?u=2',
    'https://i.pravatar.cc/150?u=3',
    'https://i.pravatar.cc/150?u=4',
    'https://i.pravatar.cc/150?u=5',
    'https://i.pravatar.cc/150?u=6',
];

const ProfileScreen = () => {
    const { user, token, setUser } = useAuth();
    const [username, setUsername] = useState(user?.username || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setAvatar(result.assets[0].uri);
        }
    };

    const handleUpdate = async () => {
        if (!username.trim()) {
            Alert.alert('Error', 'Username cannot be empty');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.put(`${API_URL}/api/auth/profile`, {
                username,
                avatar,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setUser(response.data);
            Alert.alert('Success', 'Profile updated successfully!');
        } catch (error: any) {
            console.error('Update Profile Error:', error);
            const message = error.response?.data?.message || 'Error updating profile';
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.avatar} />
                        ) : (
                            <View style={styles.placeholderAvatar}>
                                <UserIcon color="#aaa" size={60} />
                            </View>
                        )}
                        <View style={styles.cameraIcon}>
                            <Camera color="#fff" size={20} />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.emailText}>{user?.email}</Text>
                    <Text style={styles.infoNote}>Email cannot be changed</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Enter username"
                            placeholderTextColor="#aaa"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Choose a Demo Avatar</Text>
                        <View style={styles.demoAvatarGrid}>
                            {DEMO_AVATARS.map((url, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.demoAvatarItem, avatar === url && styles.selectedAvatar]}
                                    onPress={() => setAvatar(url)}
                                >
                                    <Image source={{ uri: url }} style={styles.demoAvatarImage} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleUpdate}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 20,
        paddingTop: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    placeholderAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#000',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    emailText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    infoNote: {
        fontSize: 12,
        color: '#888',
        marginTop: 5,
    },
    form: {
        marginTop: 10,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 15,
        fontSize: 16,
        color: '#000',
    },
    demoAvatarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    demoAvatarItem: {
        width: '30%',
        aspectRatio: 1,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    selectedAvatar: {
        borderColor: '#007AFF',
    },
    demoAvatarImage: {
        width: '100%',
        height: '100%',
    },
    button: {
        backgroundColor: '#000',
        height: 55,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default ProfileScreen;
