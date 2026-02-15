import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import { API_URL } from '../config';
import { User as UserIcon, MessageCircle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

const UserProfileScreen = ({ route, navigation }: any) => {
    const { userId } = route.params;
    const { user: currentUser, token } = useAuth();
    const { theme } = useTheme();

    const [user, setUser] = useState<any>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        fetchUserProfile();
        checkFollowStatus();
    }, [userId]);

    const fetchUserProfile = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/auth/profile/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(response.data);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            Alert.alert('Error', 'Could not load user profile');
        } finally {
            setLoading(false);
        }
    };

    const checkFollowStatus = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/follow/${userId}/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsFollowing(response.data.isFollowing);
        } catch (error) {
            console.error('Error checking follow status:', error);
        }
    };

    const handleFollowToggle = async () => {
        setFollowLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/follow/${userId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsFollowing(response.data.isFollowing);
            // Refresh stats
            fetchUserProfile();
        } catch (error) {
            console.error('Error toggling follow:', error);
            Alert.alert('Error', 'Could not update follow status');
        } finally {
            setFollowLoading(false);
        }
    };

    const handleBlock = async () => {
        try {
            const response = await axios.post(`${API_URL}/api/privacy/block`, { blockedId: userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert(response.data.isBlocked ? 'User Blocked' : 'User Unblocked', response.data.message);
            // Optionally navigate back or refresh feed
            if (response.data.isBlocked) {
                navigation.goBack();
            }
        } catch (error) {
            console.error('Block error:', error);
            Alert.alert('Error', 'Could not block user');
        }
    };

    const handleReportUser = async () => {
        try {
            await axios.post(`${API_URL}/api/privacy/report`, {
                targetId: userId,
                reason: 'Harassment',
                type: 'USER'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert('User Reported', 'Thank you for helping keep our community safe.');
        } catch (error) {
            console.error('Report user error:', error);
            Alert.alert('Error', 'Could not report user');
        }
    };

    const handleMessage = () => {
        navigation.navigate('ChatDetail', { otherUser: user });
    };

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!user) return null;

    const stats = user._count || { followers: 0, following: 0, posts: 0 };
    const isMe = currentUser?.id === userId;

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                {!isMe && (
                    <TouchableOpacity
                        style={styles.moreOptions}
                        onPress={() => {
                            Alert.alert(
                                "Options",
                                "",
                                [
                                    { text: "Report User", onPress: handleReportUser, style: 'destructive' },
                                    { text: "Block User", onPress: handleBlock, style: 'destructive' },
                                    { text: "Cancel", style: 'cancel' }
                                ]
                            );
                        }}
                    >
                        <Text style={[styles.moreText, { color: theme.colors.subtext }]}>•••</Text>
                    </TouchableOpacity>
                )}
                <View style={[styles.avatarContainer, { backgroundColor: theme.colors.card }]}>
                    {user.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.placeholderAvatar, { backgroundColor: theme.colors.border }]}>
                            <UserIcon color={theme.colors.subtext} size={60} />
                        </View>
                    )}
                </View>
                <Text style={[styles.username, { color: theme.colors.text }]}>@{user.username}</Text>

                {user.bio ? (
                    <Text style={[styles.bio, { color: theme.colors.text }]}>{user.bio}</Text>
                ) : null}

                <View style={[styles.statsBar, { borderTopColor: theme.colors.border }]}>
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

                {!isMe && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[
                                styles.followButton,
                                { backgroundColor: isFollowing ? theme.colors.border : theme.colors.primary }
                            ]}
                            onPress={handleFollowToggle}
                            disabled={followLoading}
                        >
                            {followLoading ? (
                                <ActivityIndicator color={isFollowing ? theme.colors.text : "#fff"} />
                            ) : (
                                <Text style={[styles.followButtonText, { color: isFollowing ? theme.colors.text : "#fff" }]}>
                                    {isFollowing ? 'Following' : 'Follow'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.messageButton, { borderColor: theme.colors.primary }]}
                            onPress={handleMessage}
                        >
                            <MessageCircle color={theme.colors.primary} size={20} />
                            <Text style={[styles.messageButtonText, { color: theme.colors.primary }]}>Message</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        padding: 20,
        paddingTop: 40,
    },
    moreOptions: {
        position: 'absolute',
        top: 20,
        right: 20,
        padding: 10,
    },
    moreText: {
        fontSize: 24,
        fontWeight: 'bold',
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
    username: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    bio: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 10,
        paddingVertical: 20,
        borderTopWidth: 1,
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
    actionButtons: {
        flexDirection: 'row',
        marginTop: 20,
        width: '100%',
        justifyContent: 'center',
    },
    followButton: {
        flex: 1,
        height: 45,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        maxWidth: 150,
    },
    followButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    messageButton: {
        flex: 1,
        height: 45,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        flexDirection: 'row',
        maxWidth: 150,
    },
    messageButtonText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default UserProfileScreen;
