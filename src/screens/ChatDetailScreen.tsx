import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image, ActivityIndicator } from 'react-native';
import { Send, Plus, Paperclip, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import io from 'socket.io-client';
import { API_URL } from '../config';

const ChatDetailScreen = ({ route, navigation }: any) => {
    const { otherUser, group } = route.params;
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const { user, token } = useAuth();
    const socketRef = useRef<any>(null);
    const isGroup = !!group;
    const [picking, setPicking] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const formatDateLabel = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) return 'Today';
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const fetchMessages = async (isInitial = false) => {
        if (!isInitial && (loadingMore || !hasMore)) return;

        if (!isInitial) setLoadingMore(true);

        try {
            const endpoint = isGroup
                ? `${API_URL}/api/messages/group/${group.id}`
                : `${API_URL}/api/messages/${user.id}/${otherUser.id}`;

            const response = await axios.get(endpoint, {
                params: { cursor: isInitial ? null : cursor, limit: 20 },
                headers: { Authorization: `Bearer ${token}` }
            });

            const { messages: newMessages, nextCursor, hasMore: moreAvailable } = response.data;

            if (isInitial) {
                setMessages(newMessages);
            } else {
                setMessages(prev => [...newMessages, ...prev]);
            }
            setCursor(nextCursor);
            setHasMore(moreAvailable);
        } catch (error: any) {
            console.error('Error fetching messages:', error);
            if (error.response?.status === 403) {
                Alert.alert('Access Denied', isGroup ? 'You are not a member of this group' : 'You need to be friends to chat with this user.');
                navigation.goBack();
            }
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchMessages(true);
        socketRef.current = io(API_URL);
        socketRef.current.emit('join', user.id);

        if (isGroup) {
            socketRef.current.emit('joinGroupRooms', [group.id]);
            socketRef.current.on('newGroupMessage', (msg: any) => {
                if (msg.groupId === group.id) {
                    setMessages(prev => [...prev, msg]);
                }
            });
        } else {
            socketRef.current.on('newMessage', (msg: any) => {
                if (msg.senderId === otherUser.id) {
                    setMessages(prev => [...prev, msg]);
                    socketRef.current.emit('markAsRead', { messageId: msg.id, senderId: msg.senderId });
                }
            });
        }

        socketRef.current.on('messageSent', (msg: any) => {
            if (!isGroup) setMessages(prev => [...prev, msg]);
        });

        socketRef.current.on('messageStatusUpdate', (data: any) => {
            setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, isDelivered: data.isDelivered, isRead: data.isRead } : m));
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [isGroup ? group.id : otherUser?.id]);

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need access to your gallery to send photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setPicking(true);
            try {
                const formData = new FormData();
                const filename = uri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename || '');
                const type = match ? `image/${match[1]}` : `image`;

                formData.append('image', {
                    uri,
                    name: filename,
                    type,
                } as any);

                // Use the existing posts endpoint which handles S3 upload
                const uploadResponse = await axios.post(`${API_URL}/api/posts`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    },
                });

                const s3Url = uploadResponse.data.imageUrl;
                const content = `PHOTO_SHARE|${s3Url}`;

                const payload: any = { senderId: user.id, content };
                if (isGroup) payload.groupId = group.id; else payload.receiverId = otherUser.id;
                socketRef.current.emit('sendMessage', payload);

                if (isGroup) {
                    const optimisticMsg = {
                        id: Math.random().toString(), senderId: user.id, groupId: group.id, content,
                        createdAt: new Date().toISOString(), sender: { id: user.id, username: user.username }
                    };
                    setMessages(prev => [...prev, optimisticMsg]);
                }
            } catch (error) {
                console.error('Error uploading photo:', error);
                Alert.alert('Upload Failed', 'Could not upload photo to S3');
            } finally {
                setPicking(false);
            }
        }
    };

    const parseMessageContent = (content: string) => {
        if (content.startsWith('POST_SHARE|')) {
            const [, postId, imageUrl, caption] = content.split('|');
            return { type: 'post', postId, imageUrl, caption };
        }
        if (content.startsWith('PHOTO_SHARE|')) {
            const [, imageUrl] = content.split('|');
            return { type: 'photo', imageUrl };
        }
        return { type: 'text', content };
    };

    const handleSend = () => {
        if (!message.trim()) return;
        const payload: any = { senderId: user.id, content: message };
        if (isGroup) payload.groupId = group.id; else payload.receiverId = otherUser.id;
        socketRef.current.emit('sendMessage', payload);
        if (isGroup) {
            const optimisticMsg = {
                id: Math.random().toString(), senderId: user.id, groupId: group.id, content: message,
                createdAt: new Date().toISOString(), sender: { id: user.id, username: user.username }
            };
            setMessages(prev => [...prev, optimisticMsg]);
        }
        setMessage('');
    };

    const renderMessage = ({ item, index }: any) => {
        const isMine = item.senderId === user.id;
        const showDate = index === 0 || new Date(item.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString();
        let statusColor = item.isRead ? '#4CAF50' : item.isDelivered ? '#FFC107' : '#aaa';

        return (
            <View>
                {showDate && <View style={styles.dateSeparator}><Text style={styles.dateText}>{formatDateLabel(item.createdAt)}</Text></View>}
                <View style={[styles.messageWrapper, isMine ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                    {isGroup && !isMine && item.sender && <Text style={styles.senderName}>{item.sender.username}</Text>}
                    <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
                        {(() => {
                            const parsed = parseMessageContent(item.content);
                            if (parsed.type === 'post') {
                                return (
                                    <View style={styles.sharedPostContent}>
                                        <Image source={{ uri: parsed.imageUrl }} style={styles.sharedPostImage} />
                                        {parsed.caption ? <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText, { marginTop: 8 }]}>{parsed.caption}</Text> : null}
                                        <View style={styles.sharedPostBadge}><Text style={styles.sharedPostBadgeText}>Shared Post</Text></View>
                                    </View>
                                );
                            } else if (parsed.type === 'photo') {
                                return (
                                    <View style={styles.photoContainer}>
                                        <Image source={{ uri: parsed.imageUrl }} style={styles.sharedPostImage} />
                                    </View>
                                );
                            }
                            return <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>{item.content}</Text>;
                        })()}
                        <View style={styles.messageFooter}>
                            <Text style={[styles.timestampText, isMine ? styles.myTimestampText : styles.theirTimestampText]}>{formatTime(item.createdAt)}</Text>
                            {isMine && <View style={[styles.statusDot, { backgroundColor: statusColor }]} />}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{isGroup ? group.name : otherUser?.username}</Text>
                {isGroup && <TouchableOpacity onPress={() => navigation.navigate('GroupSettings', { groupId: group.id })}><Text style={styles.settingsLink}>Settings</Text></TouchableOpacity>}
            </View>
            <FlatList
                data={messages}
                keyExtractor={(item, index) => (item.id || index).toString()}
                renderItem={renderMessage}
                contentContainerStyle={styles.messageList}
                ListHeaderComponent={
                    hasMore ? (
                        <TouchableOpacity onPress={() => fetchMessages()} style={styles.loadMoreButton}>
                            <Text style={styles.loadMoreText}>{loadingMore ? 'Loading...' : 'Load older messages'}</Text>
                        </TouchableOpacity>
                    ) : null
                }
            />
            <View style={styles.inputContainer}>
                {picking ? (
                    <ActivityIndicator size="small" color="#007AFF" style={{ marginRight: 10 }} />
                ) : (
                    <TouchableOpacity style={styles.attachButton} onPress={handlePickImage}>
                        <Plus color="#007AFF" size={24} />
                    </TouchableOpacity>
                )}
                <TextInput style={styles.input} placeholder="Type a message..." value={message} onChangeText={setMessage} />
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}><Send color="#fff" size={24} /></TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    messageList: { padding: 16 },
    messageWrapper: { marginBottom: 8 },
    messageBubble: { maxWidth: '80%', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, borderRadius: 12 },
    messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
    timestampText: { fontSize: 10, marginRight: 4 },
    myTimestampText: { color: '#E3F2FD' },
    theirTimestampText: { color: '#888' },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    myMessage: { alignSelf: 'flex-end', backgroundColor: '#007AFF', borderBottomRightRadius: 2 },
    theirMessage: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 2 },
    messageText: { fontSize: 16 },
    myMessageText: { color: '#fff' },
    theirMessageText: { color: '#000' },
    dateSeparator: { alignItems: 'center', marginVertical: 16 },
    dateText: { backgroundColor: '#E0E0E0', color: '#555', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, fontSize: 12, fontWeight: 'bold' },
    inputContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', alignItems: 'center' },
    input: { flex: 1, height: 40, borderWidth: 1, borderColor: '#eee', borderRadius: 20, paddingHorizontal: 16, marginRight: 10, color: '#000' },
    sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
    senderName: { fontSize: 10, color: '#666', marginBottom: 2, marginLeft: 12 },
    header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    settingsLink: { color: '#007AFF', fontSize: 14 },
    attachButton: {
        padding: 5,
        marginRight: 5,
    },
    sharedPostContent: {
        width: 200,
        borderRadius: 8,
        overflow: 'hidden',
    },
    sharedPostImage: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 8,
    },
    sharedPostBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    sharedPostBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    photoContainer: {
        width: 200,
        borderRadius: 8,
        overflow: 'hidden',
    },
    loadMoreButton: {
        padding: 10,
        alignItems: 'center',
    },
    loadMoreText: {
        color: '#007AFF',
        fontSize: 14,
    }
});

export default ChatDetailScreen;
