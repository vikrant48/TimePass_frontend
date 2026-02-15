import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import { API_URL } from '../config';
import { Camera, User as UserIcon, Moon, Sun } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';

const DEMO_AVATARS = [
    'https://i.pravatar.cc/150?u=1',
    'https://i.pravatar.cc/150?u=2',
    'https://i.pravatar.cc/150?u=3',
    'https://i.pravatar.cc/150?u=4',
    'https://i.pravatar.cc/150?u=5',
    'https://i.pravatar.cc/150?u=6',
];

const ProfileScreen = () => {
    const { user, token, setUser, logout, toggle2FA } = useAuth();
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const [username, setUsername] = useState(user?.username || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [stats, setStats] = useState(user?._count || { followers: 0, following: 0, posts: 0 });
    const [loading, setLoading] = useState(false);
    const [toggling2FA, setToggling2FA] = useState(false);

    const handleToggle2FA = async (enabled: boolean) => {
        setToggling2FA(true);
        try {
            await toggle2FA(enabled);
            Alert.alert('Success', `2FA ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('2FA toggle error:', error);
            Alert.alert('Error', 'Failed to update 2FA setting');
        } finally {
            setToggling2FA(false);
        }
    };

    React.useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        if (!token || !user) return;
        try {
            const response = await axios.get(`${API_URL}/api/auth/profile/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsername(response.data.username);
            setAvatar(response.data.avatar || '');
            setBio(response.data.bio || '');
            setStats(response.data._count || { followers: 0, following: 0, posts: 0 });
            setUser({ ...user, ...response.data });
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

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
                bio,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setUser(response.data);
            setStats(response.data._count || { followers: 0, following: 0, posts: 0 });
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
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity style={[styles.avatarContainer, { backgroundColor: theme.colors.card }]} onPress={pickImage}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.placeholderAvatar, { backgroundColor: theme.colors.border }]}>
                                <UserIcon color={theme.colors.subtext} size={60} />
                            </View>
                        )}
                        <View style={[styles.cameraIcon, { backgroundColor: theme.colors.primary, borderColor: theme.colors.card }]}>
                            <Camera color="#fff" size={20} />
                        </View>
                    </TouchableOpacity>
                    <Text style={[styles.emailText, { color: theme.colors.text }]}>{user?.email}</Text>
                    <Text style={[styles.infoNote, { color: theme.colors.subtext }]}>Email cannot be changed</Text>

                    <View style={styles.statsBar}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{stats.posts}</Text>
                            <Text style={[styles.statLabel, { color: theme.colors.subtext }]}>Posts</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{stats.followers}</Text>
                            <Text style={[styles.statLabel, { color: theme.colors.subtext }]}>Followers</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{stats.following}</Text>
                            <Text style={[styles.statLabel, { color: theme.colors.subtext }]}>Following</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.subtext }]}>Username</Text>
                        <TextInput
                            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.card }]}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Enter username"
                            placeholderTextColor={theme.colors.subtext}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.subtext }]}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.bioInput, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.card }]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Tell something about yourself..."
                            placeholderTextColor={theme.colors.subtext}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.subtext }]}>Security</Text>
                        <TouchableOpacity
                            style={[styles.themeToggle, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                            onPress={() => handleToggle2FA(!user?.twoFactorEnabled)}
                            disabled={toggling2FA}
                        >
                            <View style={styles.themeToggleLeft}>
                                <Text style={[styles.themeToggleText, { color: theme.colors.text }]}>
                                    Two-Factor Authentication
                                </Text>
                            </View>
                            {toggling2FA ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                                <Text style={{ color: user?.twoFactorEnabled ? theme.colors.primary : theme.colors.subtext, fontWeight: 'bold' }}>
                                    {user?.twoFactorEnabled ? 'ON' : 'OFF'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.subtext }]}>Theme Settings</Text>
                        <TouchableOpacity
                            style={[styles.themeToggle, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                            onPress={toggleTheme}
                        >
                            <View style={styles.themeToggleLeft}>
                                {isDarkMode ? <Moon size={20} color={theme.colors.primary} /> : <Sun size={20} color={theme.colors.primary} />}
                                <Text style={[styles.themeToggleText, { color: theme.colors.text }]}>
                                    {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                                </Text>
                            </View>
                            <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Toggle</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.subtext }]}>Choose a Demo Avatar</Text>
                        <View style={styles.demoAvatarGrid}>
                            {DEMO_AVATARS.map((url, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.demoAvatarItem, avatar === url && [styles.selectedAvatar, { borderColor: theme.colors.primary }]]}
                                    onPress={() => setAvatar(url)}
                                >
                                    <Image source={{ uri: url }} style={styles.demoAvatarImage} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: theme.colors.primary }, loading && styles.buttonDisabled]}
                        onPress={handleUpdate}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.logoutButton, { borderColor: theme.colors.error }]}
                        onPress={logout}
                    >
                        <Text style={[styles.logoutText, { color: theme.colors.error }]}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
    },
    emailText: {
        fontSize: 18,
        fontWeight: '600',
    },
    infoNote: {
        fontSize: 12,
        marginTop: 5,
        marginBottom: 20,
    },
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 12,
        marginTop: 2,
    },
    form: {
        marginTop: 10,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        fontSize: 16,
    },
    bioInput: {
        height: 100,
        paddingTop: 15,
        textAlignVertical: 'top',
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
    themeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 5,
    },
    themeToggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    themeToggleText: {
        fontSize: 16,
        marginLeft: 10,
        fontWeight: '500',
    },
    logoutButton: {
        marginTop: 30,
        marginBottom: 40,
        height: 55,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    logoutText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default ProfileScreen;
