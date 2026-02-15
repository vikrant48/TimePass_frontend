import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, TextInput, FlatList, Dimensions } from 'react-native';
import { Heart, MessageCircle, Send, MoreHorizontal } from 'lucide-react-native';

interface PostProps {
    post: {
        id: string;
        images: string[];
        caption: string;
        isLiked?: boolean;
        likes?: any[];
        user: {
            id: string;
            username: string;
            avatar: string | null;
        };
        _count: {
            likes: number;
            comments: number;
        };
        comments?: any[];
    };
    onLike: (isLiked: boolean) => void;
    onComment: (comment: string) => void;
    onShare: () => void;
    navigation: any;
}

import axios from 'axios';
import { API_URL } from '../config';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../store/AuthContext';
import { Alert } from 'react-native';

const PostCard: React.FC<PostProps> = ({ post, onLike, onShare, onComment, navigation }) => {
    const [isLiked, setIsLiked] = React.useState(post.isLiked);
    const [likeCount, setLikeCount] = React.useState(post._count.likes);
    const [showCommentInput, setShowCommentInput] = React.useState(false);
    const [commentText, setCommentText] = React.useState('');
    const [activeIndex, setActiveIndex] = React.useState(0);
    const { theme } = useTheme();
    const { token } = useAuth();

    const handleLikeToggle = () => {
        const newStatus = !isLiked;
        setIsLiked(newStatus);
        setLikeCount(prev => newStatus ? prev + 1 : prev - 1);
        onLike(newStatus);
    };

    const handleCommentSubmit = () => {
        if (commentText.trim()) {
            onComment(commentText);
            setCommentText('');
            setShowCommentInput(false);
        }
    };

    const handleReport = async () => {
        try {
            await axios.post(`${API_URL}/api/privacy/report`, {
                targetId: post.id,
                reason: 'Inappropriate Content',
                type: 'POST'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Post reported. Thank you for helping keep our community safe.');
        } catch (error) {
            console.error('Report error:', error);
            alert('Failed to report post.');
        }
    };

    const navigateToProfile = () => {
        navigation.navigate('UserProfile', { userId: post.user.id });
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.userInfo} onPress={navigateToProfile}>
                    <Image
                        source={{ uri: post.user.avatar || 'https://via.placeholder.com/32' }}
                        style={[styles.avatar, { backgroundColor: theme.colors.background }]}
                    />
                    <Text style={[styles.username, { color: theme.colors.text }]}>{post.user.username}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                    Alert.alert(
                        "Post Options",
                        "",
                        [
                            { text: "Report Post", onPress: handleReport, style: 'destructive' },
                            { text: "Cancel", style: 'cancel' }
                        ]
                    );
                }}>
                    <MoreHorizontal color={theme.colors.text} size={20} />
                </TouchableOpacity>
            </View>

            {post.images && post.images.length > 0 ? (
                <View>
                    <FlatList
                        data={post.images}
                        keyExtractor={(item, index) => `${post.id}-image-${index}`}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={(e) => {
                            const offset = e.nativeEvent.contentOffset.x;
                            const index = Math.round(offset / Dimensions.get('window').width);
                            setActiveIndex(index);
                        }}
                        renderItem={({ item }) => (
                            <Image
                                source={{ uri: item }}
                                style={[styles.postImage, { backgroundColor: theme.colors.background }]}
                                resizeMode="cover"
                            />
                        )}
                    />
                    {post.images.length > 1 && (
                        <View style={styles.pagination}>
                            {post.images.map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.dot,
                                        { backgroundColor: index === activeIndex ? theme.colors.primary : 'rgba(255,255,255,0.5)' }
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                </View>
            ) : null}

            <View style={styles.actions}>
                <View style={styles.leftActions}>
                    <TouchableOpacity onPress={handleLikeToggle} style={styles.actionButton}>
                        <Heart
                            color={isLiked ? "#ED4956" : theme.colors.text}
                            fill={isLiked ? "#ED4956" : "transparent"}
                            size={24}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setShowCommentInput(!showCommentInput)}
                    >
                        <MessageCircle color={theme.colors.text} size={24} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onShare} style={styles.actionButton}>
                        <Send color={theme.colors.text} size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.likesContainer}>
                <Text style={[styles.likesText, { color: theme.colors.text }]}>{likeCount} likes</Text>
            </View>

            <View style={styles.captionContainer}>
                <View style={styles.captionRow}>
                    <Text style={[styles.username, { color: theme.colors.text }]}>{post.user.username} </Text>
                    <Text style={[styles.captionText, { color: theme.colors.text }]}>{post.caption}</Text>
                </View>
            </View>

            {post.comments && post.comments.length > 0 && (
                <View style={styles.commentsList}>
                    {post.comments.map((comment: any) => (
                        <View key={comment.id} style={styles.commentItem}>
                            <Text style={[styles.commentUsername, { color: theme.colors.text }]}>{comment.user.username} </Text>
                            <Text style={[styles.commentText, { color: theme.colors.subtext }]}>{comment.content}</Text>
                        </View>
                    ))}
                </View>
            )}

            {showCommentInput && (
                <View style={styles.commentInputContainer}>
                    <View style={[styles.inputWrapper, { borderBottomColor: theme.colors.border }]}>
                        <TextInput
                            style={[styles.commentInput, { color: theme.colors.text }]}
                            placeholder="Add a comment..."
                            placeholderTextColor={theme.colors.subtext}
                            value={commentText}
                            onChangeText={setCommentText}
                            multiline
                        />
                        <TouchableOpacity onPress={handleCommentSubmit}>
                            <Text style={[styles.postText, { color: theme.colors.primary }]}>Post</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {post._count.comments > 0 && (
                <TouchableOpacity style={styles.commentsContainer}>
                    <Text style={[styles.viewCommentsText, { color: theme.colors.subtext }]}>
                        View all {post._count.comments} comments
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
    },
    username: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    postImage: {
        width: Dimensions.get('window').width,
        aspectRatio: 1,
    },
    pagination: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 10,
        alignSelf: 'center',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginHorizontal: 3,
    },
    actions: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    leftActions: {
        flexDirection: 'row',
    },
    actionButton: {
        marginRight: 16,
    },
    likesContainer: {
        paddingHorizontal: 12,
    },
    likesText: {
        fontWeight: 'bold',
    },
    captionContainer: {
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    captionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    captionText: {
    },
    commentInputContainer: {
        paddingHorizontal: 12,
        paddingBottom: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    commentInput: {
        flex: 1,
        paddingVertical: 8,
        fontSize: 14,
    },
    postText: {
        fontWeight: 'bold',
        marginLeft: 10,
    },
    commentsContainer: {
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    viewCommentsText: {
        fontSize: 14,
    },
    commentsList: {
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    commentUsername: {
        fontWeight: 'bold',
        fontSize: 13,
    },
    commentText: {
        fontSize: 13,
    },
});

export default PostCard;
