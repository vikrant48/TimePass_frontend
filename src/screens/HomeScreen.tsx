import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import ShareModal from '../components/ShareModal';
import { PlusSquare } from 'lucide-react-native';
import { API_URL } from '../config';

const HomeScreen = () => {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const { user, token } = useAuth();

    const fetchPosts = async (isRefreshing = false) => {
        if (!isRefreshing && (loadingMore || !hasMore)) return;

        if (isRefreshing) {
            setRefreshing(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const currentCursor = isRefreshing ? null : cursor;
            const response = await axios.get(`${API_URL}/api/posts/feed`, {
                params: { cursor: currentCursor, limit: 10 },
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
    }, []);

    const onRefresh = () => {
        fetchPosts(true);
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

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={posts}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={({ item }) => (
                    <PostCard
                        post={item}
                        onLike={(isLiked) => handleLike(item.id, isLiked)}
                        onComment={(content) => handleComment(item.id, content)}
                        onShare={() => {
                            setSelectedPost(item);
                            setShareModalVisible(true);
                        }}
                    />
                )}
                refreshControl={
                    <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
                }
                onEndReached={() => fetchPosts()}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={{ paddingVertical: 20 }}>
                            <ActivityIndicator size="small" color="#000" />
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No posts yet. Be the first to post!</Text>
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
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
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        color: '#888',
    },
});

export default HomeScreen;
