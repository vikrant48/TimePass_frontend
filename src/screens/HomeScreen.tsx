import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Platform, TextInput, ScrollView, Image } from 'react-native';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import ShareModal from '../components/ShareModal';
import StoryViewerModal from '../components/StoryViewerModal';
import { PlusSquare, Search } from 'lucide-react-native';
import { API_URL } from '../config';
import { useTheme } from '../theme/ThemeContext';

const getPublicUrl = (url: string) => {
    if (!url) return url;
    if (url.includes('storage.supabase.co')) {
        return url.replace('.storage.supabase.co/', '.supabase.co/storage/v1/object/public/');
    }
    return url;
};

const HomeScreen = ({ navigation }: any) => {
    const [posts, setPosts] = useState<any[]>([]);
    const [stories, setStories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [storyViewerVisible, setStoryViewerVisible] = useState(false);
    const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
    const { user, token } = useAuth();
    const { theme } = useTheme();

    const fetchPosts = async (isRefreshing = false, search = searchQuery) => {
        if (!isRefreshing && (loadingMore || !hasMore)) return;

        if (isRefreshing) {
            setRefreshing(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const currentCursor = isRefreshing ? null : cursor;
            const response = await axios.get(`${API_URL}/api/posts/feed`, {
                params: { cursor: currentCursor, limit: 10, search: search || undefined },
                headers: { Authorization: `Bearer ${token}` },
            });

            const { posts: newPosts, nextCursor, hasMore: moreAvailable } = response.data;

            setPosts(prev => isRefreshing ? newPosts : [...prev, ...newPosts]);
            setCursor(nextCursor);
            setHasMore(moreAvailable);
        } catch (error) {
            console.error('Error fetching feed:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchPosts(true);
        fetchStories();
    }, []);

    const fetchStories = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/stories`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStories(response.data);
        } catch (error) {
            console.error('Error fetching stories:', error);
        }
    };

    const onRefresh = () => {
        fetchPosts(true);
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        // Debounce search
        const timeout = setTimeout(() => {
            fetchPosts(true, text);
        }, 500);
        return () => clearTimeout(timeout);
    };

    const handleLike = async (postId: string, isLiked: boolean) => {
        try {
            await axios.post(`${API_URL}/api/posts/${postId}/like`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // State is managed optimistically in PostCard, but we update the main list too
            setPosts(prev => prev.map(p =>
                p.id === postId
                    ? { ...p, isLiked, _count: { ...p._count, likes: isLiked ? p._count.likes + 1 : p._count.likes - 1 } }
                    : p
            ));
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const handleComment = async (postId: string, content: string) => {
        try {
            await axios.post(`${API_URL}/api/posts/${postId}/comment`, { content }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setPosts(prev => prev.map(p =>
                p.id === postId
                    ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } }
                    : p
            ));
        } catch (error) {
            console.error('Error commenting:', error);
        }
    };

    const renderStories = () => {
        return (
            <View style={[styles.storiesContainer, { borderBottomColor: theme.colors.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesContent}>
                    <TouchableOpacity style={styles.storyItem} onPress={() => setModalVisible(true)}>
                        <View style={[styles.addStoryRing, { borderColor: theme.colors.primary }]}>
                            <Image source={{ uri: user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=random` }} style={styles.storyAvatar} />
                            <View style={[styles.plusIcon, { backgroundColor: theme.colors.primary }]}>
                                <Text style={styles.plusText}>+</Text>
                            </View>
                        </View>
                        <Text style={[styles.storyUsername, { color: theme.colors.text }]} numberOfLines={1}>Your Story</Text>
                    </TouchableOpacity>

                    {stories.map((story, index) => (
                        <TouchableOpacity
                            key={story.id}
                            style={styles.storyItem}
                            onPress={() => {
                                setSelectedStoryIndex(index);
                                setStoryViewerVisible(true);
                            }}
                        >
                            <View style={[styles.storyRing, { borderColor: theme.colors.primary }]}>
                                <Image source={{ uri: getPublicUrl(story.user.avatar) || `https://ui-avatars.com/api/?name=${story.user.username}&background=random` }} style={styles.storyAvatar} />
                            </View>
                            <Text style={[styles.storyUsername, { color: theme.colors.text }]} numberOfLines={1}>{story.user.username}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

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
                    placeholder="Search posts..."
                    placeholderTextColor={theme.colors.subtext}
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>
            <FlatList
                data={posts}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                ListHeaderComponent={renderStories}
                renderItem={({ item }) => (
                    <PostCard
                        post={item}
                        onLike={(isLiked) => handleLike(item.id, isLiked)}
                        onComment={(content) => handleComment(item.id, content)}
                        onShare={() => {
                            setSelectedPost(item);
                            setShareModalVisible(true);
                        }}
                        navigation={navigation}
                    />
                )}
                refreshControl={
                    <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
                onEndReached={() => fetchPosts()}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={{ paddingVertical: 20 }}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: theme.colors.subtext }]}>No posts found.</Text>
                    </View>
                }
            />

            <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={() => setModalVisible(true)}>
                <PlusSquare color="#fff" size={32} />
            </TouchableOpacity>

            <CreatePostModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onPostCreated={onRefresh}
            />

            <ShareModal
                visible={shareModalVisible}
                onClose={() => setShareModalVisible(false)}
                post={selectedPost}
            />

            <StoryViewerModal
                visible={storyViewerVisible}
                stories={stories}
                initialIndex={selectedStoryIndex}
                onClose={() => setStoryViewerVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
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
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
    },
    storiesContainer: {
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    storiesContent: {
        paddingHorizontal: 15,
    },
    storyItem: {
        alignItems: 'center',
        marginRight: 15,
        width: 70,
    },
    storyRing: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addStoryRing: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    storyAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    plusIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    plusText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: -2,
    },
    storyUsername: {
        fontSize: 11,
        marginTop: 5,
        textAlign: 'center',
    },
});

export default HomeScreen;
