import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Heart, MessageCircle, Send, MoreHorizontal } from 'lucide-react-native';

interface PostProps {
    post: {
        id: string;
        imageUrl: string;
        caption: string;
        isLiked?: boolean;
        likes?: any[];
        user: {
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
}

const PostCard: React.FC<PostProps> = ({ post, onLike, onShare, onComment }) => {
    const [isLiked, setIsLiked] = React.useState(post.isLiked);
    const [likeCount, setLikeCount] = React.useState(post._count.likes);
    const [showCommentInput, setShowCommentInput] = React.useState(false);
    const [commentText, setCommentText] = React.useState('');

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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Image
                        source={{ uri: post.user.avatar || 'https://via.placeholder.com/32' }}
                        style={styles.avatar}
                    />
                    <Text style={styles.username}>{post.user.username}</Text>
                </View>
                <TouchableOpacity>
                    <MoreHorizontal color="#000" size={20} />
                </TouchableOpacity>
            </View>

            <Image source={{ uri: post.imageUrl }} style={styles.postImage} />

            <View style={styles.actions}>
                <View style={styles.leftActions}>
                    <TouchableOpacity onPress={handleLikeToggle} style={styles.actionButton}>
                        <Heart
                            color={isLiked ? "#ED4956" : "#000"}
                            fill={isLiked ? "#ED4956" : "transparent"}
                            size={24}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setShowCommentInput(!showCommentInput)}
                    >
                        <MessageCircle color="#000" size={24} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onShare} style={styles.actionButton}>
                        <Send color="#000" size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.likesContainer}>
                <Text style={styles.likesText}>{likeCount} likes</Text>
            </View>

            <View style={styles.captionContainer}>
                <View style={styles.captionRow}>
                    <Text style={styles.username}>{post.user.username} </Text>
                    <Text style={styles.captionText}>{post.caption}</Text>
                </View>
            </View>

            {post.comments && post.comments.length > 0 && (
                <View style={styles.commentsList}>
                    {post.comments.map((comment: any) => (
                        <View key={comment.id} style={styles.commentItem}>
                            <Text style={styles.commentUsername}>{comment.user.username} </Text>
                            <Text style={styles.commentText}>{comment.content}</Text>
                        </View>
                    ))}
                </View>
            )}

            {showCommentInput && (
                <View style={styles.commentInputContainer}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.commentInput}
                            placeholder="Add a comment..."
                            value={commentText}
                            onChangeText={setCommentText}
                            multiline
                        />
                        <TouchableOpacity onPress={handleCommentSubmit}>
                            <Text style={styles.postText}>Post</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {post._count.comments > 0 && (
                <TouchableOpacity style={styles.commentsContainer}>
                    <Text style={styles.viewCommentsText}>
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
        backgroundColor: '#fff',
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
        backgroundColor: '#eee',
    },
    username: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#000',
    },
    postImage: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#eee',
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
        color: '#000',
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
        color: '#000',
    },
    commentInputContainer: {
        paddingHorizontal: 12,
        paddingBottom: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    commentInput: {
        flex: 1,
        paddingVertical: 8,
        fontSize: 14,
        color: '#000',
    },
    postText: {
        color: '#007AFF',
        fontWeight: 'bold',
        marginLeft: 10,
    },
    commentsContainer: {
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    viewCommentsText: {
        color: '#888',
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
        color: '#000',
    },
    commentText: {
        fontSize: 13,
        color: '#333',
    },
});

export default PostCard;
