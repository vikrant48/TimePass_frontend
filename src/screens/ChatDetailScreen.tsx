import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image, ActivityIndicator } from 'react-native';
import { Send, Plus, Paperclip, Image as ImageIcon, Mic, Edit2, Trash2, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import io from 'socket.io-client';
import { API_URL } from '../config';
import { useTheme } from '../theme/ThemeContext';

const getPublicUrl = (url: string) => {
    if (!url) return url;
    if (url.includes('storage.supabase.co')) {
        return url.replace('.storage.supabase.co/', '.supabase.co/storage/v1/object/public/');
    }
    return url;
};

const ChatDetailScreen = ({ route, navigation }: any) => {
    const { otherUser, group } = route.params;
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const { user, token } = useAuth();
    const { theme } = useTheme();
    const socketRef = useRef<any>(null);
    const isGroup = !!group;
    const [picking, setPicking] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    // Typing Indicators
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const typingTimeoutRef = useRef<any>(null);

    // Editing State
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

    // Voice Recording
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);

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
        }

        socketRef.current.on('newGroupMessage', (msg: any) => {
            if (isGroup && msg.groupId === group.id) {
                setMessages(prev => [...prev, msg]);
            }
        });

        socketRef.current.on('newMessage', (msg: any) => {
            if (!isGroup && msg.senderId === otherUser.id) {
                setMessages(prev => [...prev, msg]);
                socketRef.current.emit('markAsRead', { messageId: msg.id, senderId: msg.senderId });
            }
        });

        socketRef.current.on('messageSent', (msg: any) => {
            if (!isGroup) setMessages(prev => [...prev, msg]);
        });

        socketRef.current.on('messageStatusUpdate', (data: any) => {
            setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, isDelivered: data.isDelivered, isRead: data.isRead } : m));
        });

        // Typing Indicators
        socketRef.current.on('userTyping', (data: any) => {
            if (data.senderId === user.id) return;
            setTypingUsers(prev => {
                const next = new Set(prev);
                if (data.isTyping) next.add(data.username);
                else next.delete(data.username);
                return next;
            });
        });

        // Edit/Delete
        socketRef.current.on('messageEdited', (updatedMsg: any) => {
            setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        });

        socketRef.current.on('messageDeleted', (data: { messageId: string }) => {
            setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, content: 'This message was deleted', isDeleted: true } : m));
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [isGroup ? group.id : otherUser?.id]);

    const handleTyping = (text: string) => {
        setMessage(text);

        if (socketRef.current) {
            socketRef.current.emit('typing', {
                senderId: user.id,
                username: user.username,
                receiverId: isGroup ? undefined : otherUser.id,
                groupId: isGroup ? group.id : undefined,
                isTyping: true
            });

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socketRef.current.emit('typing', {
                    senderId: user.id,
                    username: user.username,
                    receiverId: isGroup ? undefined : otherUser.id,
                    groupId: isGroup ? group.id : undefined,
                    isTyping: false
                });
            }, 3000);
        }
    };

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

                if (Platform.OS === 'web') {
                    const blob = await fetch(uri).then(r => r.blob());
                    formData.append('images', blob, filename);
                } else {
                    formData.append('images', {
                        uri,
                        name: filename,
                        type,
                    } as any);
                }

                // Use the existing posts endpoint which handles S3 upload
                const uploadResponse = await axios.post(`${API_URL}/api/posts`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    },
                });

                const s3Url = uploadResponse.data.images[0];
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

    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') return;

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        setIsRecording(false);
        if (!recording) return;

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);

        if (uri) {
            setPicking(true);
            try {
                const formData = new FormData();
                const filename = `voice_${Date.now()}.m4a`;
                if (Platform.OS === 'web') {
                    const blob = await fetch(uri).then(r => r.blob());
                    formData.append('images', blob, filename);
                } else {
                    formData.append('images', { uri, name: filename, type: 'audio/m4a' } as any);
                }

                const uploadResponse = await axios.post(`${API_URL}/api/posts`, formData, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
                });

                const content = `VOICE_MESSAGE|${uploadResponse.data.images[0]}`;
                const payload: any = { senderId: user.id, content };
                if (isGroup) payload.groupId = group.id; else payload.receiverId = otherUser.id;
                socketRef.current.emit('sendMessage', payload);
                if (isGroup) {
                    setMessages(prev => [...prev, {
                        id: Math.random().toString(), senderId: user.id, groupId: group.id, content,
                        createdAt: new Date().toISOString(), sender: { id: user.id, username: user.username }
                    }]);
                }
            } catch (error) {
                console.error('Error uploading voice message:', error);
            } finally {
                setPicking(false);
            }
        }
    };

    const handleEdit = (item: any) => {
        setEditingMessageId(item.id);
        setMessage(item.content);
    };

    const cancelEdit = () => {
        setEditingMessageId(null);
        setMessage('');
    };

    const handleDelete = (item: any) => {
        Alert.alert('Delete Message', 'Are you sure you want to unsend this message?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    socketRef.current.emit('deleteMessage', {
                        messageId: item.id,
                        senderId: user.id,
                        receiverId: isGroup ? undefined : otherUser.id,
                        groupId: isGroup ? group.id : undefined
                    });
                }
            }
        ]);
    };

    const parseMessageContent = (content: string) => {
        if (content.startsWith('POST_SHARE|')) {
            const [, postId, imageUrl, caption] = content.split('|');
            return { type: 'post', postId, imageUrl: getPublicUrl(imageUrl), caption };
        }
        if (content.startsWith('PHOTO_SHARE|')) {
            const [, imageUrl] = content.split('|');
            return { type: 'photo', imageUrl: getPublicUrl(imageUrl) };
        }
        if (content.startsWith('VOICE_MESSAGE|')) {
            const [, audioUrl] = content.split('|');
            return { type: 'voice', audioUrl };
        }
        return { type: 'text', content };
    };

    const handleSend = () => {
        if (!message.trim()) return;

        if (editingMessageId) {
            socketRef.current.emit('editMessage', {
                messageId: editingMessageId,
                senderId: user.id,
                content: message,
                receiverId: isGroup ? undefined : otherUser.id,
                groupId: isGroup ? group.id : undefined
            });
            setEditingMessageId(null);
            setMessage('');
            return;
        }

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

    const VoiceMessagePlayer = ({ audioUrl, isMine }: any) => {
        const [sound, setSound] = useState<Audio.Sound | null>(null);
        const [isPlaying, setIsPlaying] = useState(false);

        const playSound = async () => {
            if (sound) {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await sound.playAsync();
                    setIsPlaying(true);
                }
                return;
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                { shouldPlay: true }
            );
            setSound(newSound);
            setIsPlaying(true);
            newSound.setOnPlaybackStatusUpdate((status: any) => {
                if (status.didJustFinish) setIsPlaying(false);
            });
        };

        useEffect(() => {
            return () => {
                if (sound) sound.unloadAsync();
            };
        }, [sound]);

        return (
            <TouchableOpacity onPress={playSound} style={styles.voicePlayer}>
                <View style={[styles.playButton, { backgroundColor: isMine ? '#fff' : '#007AFF' }]}>
                    <Text style={{ color: isMine ? '#007AFF' : '#fff', fontWeight: 'bold' }}>{isPlaying ? '⏸' : '▶'}</Text>
                </View>
                <View style={styles.voiceWaveform} />
                <Text style={[styles.voiceDuration, { color: isMine ? '#E3F2FD' : '#888' }]}>Voice</Text>
            </TouchableOpacity>
        );
    };

    const renderMessage = ({ item, index }: any) => {
        const isMine = item.senderId === user.id;
        const showDate = index === 0 || new Date(item.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString();
        let statusColor = item.isRead ? '#4CAF50' : item.isDelivered ? '#FFC107' : '#aaa';

        const handleLongPress = () => {
            if (isMine && !item.isDeleted) {
                Alert.alert('Message Options', '', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Edit', onPress: () => handleEdit(item) },
                    { text: 'Unsend', style: 'destructive', onPress: () => handleDelete(item) }
                ]);
            }
        };

        return (
            <View>
                {showDate && (
                    <View style={styles.dateSeparator}>
                        <Text style={[styles.dateText, { backgroundColor: theme.dark ? '#333' : '#E0E0E0', color: theme.colors.subtext }]}>
                            {formatDateLabel(item.createdAt)}
                        </Text>
                    </View>
                )}
                <View style={[styles.messageWrapper, isMine ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                    {isGroup && !isMine && item.sender && (
                        <Text style={[styles.senderName, { color: theme.colors.subtext }]}>{item.sender.username}</Text>
                    )}
                    <TouchableOpacity
                        onLongPress={handleLongPress}
                        activeOpacity={0.8}
                        style={[
                            styles.messageBubble,
                            isMine ? [styles.myMessage, { backgroundColor: theme.colors.myMessage }] : [styles.theirMessage, { backgroundColor: theme.colors.theirMessage }],
                            item.isDeleted && [styles.deletedMessage, { borderColor: theme.colors.border }]
                        ]}
                    >
                        {(() => {
                            const parsed = parseMessageContent(item.content);
                            if (parsed.type === 'post') {
                                return (
                                    <View style={styles.sharedPostContent}>
                                        <Image source={{ uri: parsed.imageUrl }} style={styles.sharedPostImage} />
                                        {parsed.caption ? (
                                            <Text style={[styles.messageText, isMine ? styles.myMessageText : [styles.theirMessageText, { color: theme.colors.text }], { marginTop: 8 }]}>
                                                {parsed.caption}
                                            </Text>
                                        ) : null}
                                        <View style={styles.sharedPostBadge}><Text style={styles.sharedPostBadgeText}>Shared Post</Text></View>
                                    </View>
                                );
                            } else if (parsed.type === 'photo') {
                                return (
                                    <View style={styles.photoContainer}>
                                        <Image source={{ uri: parsed.imageUrl }} style={styles.sharedPostImage} />
                                    </View>
                                );
                            } else if (parsed.type === 'voice') {
                                return <VoiceMessagePlayer audioUrl={parsed.audioUrl} isMine={isMine} />;
                            }
                            return (
                                <Text style={[
                                    styles.messageText,
                                    isMine ? styles.myMessageText : [styles.theirMessageText, { color: theme.colors.text }],
                                    item.isDeleted && [styles.deletedMessageText, { color: theme.colors.subtext }]
                                ]}>
                                    {item.content}
                                </Text>
                            );
                        })()}
                        <View style={styles.messageFooter}>
                            {item.isEdited && !item.isDeleted && (
                                <Text style={[styles.statusText, isMine ? styles.myTimestampText : [styles.theirTimestampText, { color: theme.colors.subtext }], { marginRight: 4 }]}>
                                    Edited
                                </Text>
                            )}
                            <Text style={[styles.timestampText, isMine ? styles.myTimestampText : [styles.theirTimestampText, { color: theme.colors.subtext }]]}>
                                {formatTime(item.createdAt)}
                            </Text>
                            {isMine && !item.isDeleted && <View style={[styles.statusDot, { backgroundColor: statusColor }]} />}
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
            <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
                <View>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{isGroup ? group.name : otherUser?.username}</Text>
                    {typingUsers.size > 0 && (
                        <Text style={[styles.typingIndicator, { color: theme.colors.accent }]}>
                            {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                        </Text>
                    )}
                </View>
                {isGroup && <TouchableOpacity onPress={() => navigation.navigate('GroupSettings', { groupId: group.id })}><Text style={[styles.settingsLink, { color: theme.colors.primary }]}>Settings</Text></TouchableOpacity>}
            </View>
            <FlatList
                data={messages}
                keyExtractor={(item, index) => (item.id || index).toString()}
                renderItem={renderMessage}
                contentContainerStyle={styles.messageList}
                ListHeaderComponent={
                    hasMore ? (
                        <TouchableOpacity onPress={() => fetchMessages()} style={styles.loadMoreButton}>
                            <Text style={[styles.loadMoreText, { color: theme.colors.primary }]}>{loadingMore ? 'Loading...' : 'Load older messages'}</Text>
                        </TouchableOpacity>
                    ) : null
                }
            />

            {editingMessageId && (
                <View style={[styles.editingBanner, { backgroundColor: theme.dark ? '#1A1A1A' : '#E3F2FD', borderTopColor: theme.colors.border }]}>
                    <Edit2 size={16} color={theme.colors.primary} />
                    <Text style={[styles.editingText, { color: theme.colors.primary }]}>Editing message</Text>
                    <TouchableOpacity onPress={cancelEdit}><X size={18} color={theme.colors.subtext} /></TouchableOpacity>
                </View>
            )}

            <View style={[styles.inputContainer, { backgroundColor: theme.colors.card }]}>
                {picking ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 10 }} />
                ) : (
                    <TouchableOpacity style={styles.attachButton} onPress={handlePickImage} disabled={isRecording}>
                        <Plus color={isRecording ? theme.colors.border : theme.colors.primary} size={24} />
                    </TouchableOpacity>
                )}

                <TextInput
                    style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }, isRecording && styles.recordingInput]}
                    placeholder={isRecording ? "Recording..." : "Type a message..."}
                    placeholderTextColor={theme.colors.subtext}
                    value={isRecording ? "" : message}
                    onChangeText={handleTyping}
                    editable={!isRecording}
                />

                {message.trim() || editingMessageId ? (
                    <TouchableOpacity style={[styles.sendButton, { backgroundColor: theme.colors.primary }]} onPress={handleSend}>
                        <Send color="#fff" size={20} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.micButton, { backgroundColor: theme.colors.background }, isRecording && styles.micButtonActive]}
                        onPressIn={startRecording}
                        onPressOut={stopRecording}
                    >
                        <Mic color={isRecording ? "#fff" : theme.colors.subtext} size={24} />
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    messageList: { padding: 16 },
    messageWrapper: { marginBottom: 8 },
    messageBubble: { maxWidth: '80%', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, borderRadius: 12 },
    messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
    timestampText: { fontSize: 10, marginRight: 4 },
    statusText: { fontSize: 10, fontStyle: 'italic' },
    myTimestampText: { color: 'rgba(255, 255, 255, 0.7)' },
    theirTimestampText: { color: '#888' },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    myMessage: { alignSelf: 'flex-end', borderBottomRightRadius: 2 },
    theirMessage: { alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
    deletedMessage: { borderStyle: 'dotted', borderWidth: 1, opacity: 0.6 },
    messageText: { fontSize: 16 },
    myMessageText: { color: '#fff' },
    theirMessageText: {},
    deletedMessageText: { fontStyle: 'italic' },
    dateSeparator: { alignItems: 'center', marginVertical: 16 },
    dateText: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, fontSize: 12, fontWeight: 'bold' },
    inputContainer: { flexDirection: 'row', padding: 16, alignItems: 'center' },
    input: { flex: 1, height: 40, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, marginRight: 10 },
    recordingInput: { backgroundColor: '#FFF9C4', borderColor: '#FBC02D' },
    sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    micButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    micButtonActive: { backgroundColor: '#FF3B30' },
    senderName: { fontSize: 10, marginBottom: 2, marginLeft: 12 },
    header: { padding: 16, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    typingIndicator: { fontSize: 12, marginTop: 2 },
    settingsLink: { fontSize: 14 },
    attachButton: { padding: 5, marginRight: 5 },
    sharedPostContent: { width: 200, borderRadius: 8, overflow: 'hidden' },
    sharedPostImage: { width: '100%', aspectRatio: 1, borderRadius: 8 },
    sharedPostBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    sharedPostBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    photoContainer: { width: 200, borderRadius: 8, overflow: 'hidden' },
    loadMoreButton: { padding: 10, alignItems: 'center' },
    loadMoreText: { fontSize: 14 },
    editingBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1 },
    editingText: { flex: 1, fontSize: 14, marginLeft: 8 },
    voicePlayer: { flexDirection: 'row', alignItems: 'center', width: 200, paddingVertical: 4 },
    playButton: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    voiceWaveform: { flex: 1, height: 2, backgroundColor: 'rgba(128,128,128,0.2)', borderRadius: 1 },
    voiceDuration: { fontSize: 10, marginLeft: 10 }
});

export default ChatDetailScreen;
