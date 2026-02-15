import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Image, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { Camera, X } from 'lucide-react-native';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import { API_URL } from '../config';
import * as ImagePicker from 'expo-image-picker';

interface CreatePostModalProps {
    visible: boolean;
    onClose: () => void;
    onPostCreated: () => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ visible, onClose, onPostCreated }) => {
    const [caption, setCaption] = useState('');
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [isStory, setIsStory] = useState(false);
    const { token } = useAuth();

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: !isStory && imageUrls.length === 0, // Disable editing for multiple
            allowsMultipleSelection: !isStory,
            selectionLimit: isStory ? 1 : 10,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            const uris = result.assets.map(a => a.uri);
            setImageUrls(isStory ? [uris[0]] : [...imageUrls, ...uris].slice(0, 10));
        }
    };

    const handleCreatePost = async () => {
        if (imageUrls.length === 0) {
            alert('Please select at least one image');
            return;
        }
        setLoading(true);
        try {
            const formData = new FormData();

            if (isStory) {
                const uri = imageUrls[0];
                const filename = uri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename || '');
                const type = match ? `image/${match[1]}` : `image`;
                formData.append('image', { uri, name: filename, type } as any);

                await axios.post(`${API_URL}/api/stories`, formData, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
                });
            } else {
                formData.append('caption', caption);
                imageUrls.forEach((uri, index) => {
                    const filename = uri.split('/').pop();
                    const match = /\.(\w+)$/.exec(filename || '');
                    const type = match ? `image/${match[1]}` : `image`;
                    formData.append('images', { uri, name: filename, type } as any);
                });

                await axios.post(`${API_URL}/api/posts`, formData, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
                });
            }

            setCaption('');
            setImageUrls([]);
            setIsStory(false);
            onPostCreated();
            onClose();
        } catch (error) {
            console.error('Error creating post/story:', error);
            alert('Failed to share');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={!!visible} animationType="slide">
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <X color="#000" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Post</Text>
                    <TouchableOpacity onPress={handleCreatePost} disabled={!!loading}>
                        <Text style={[styles.shareText, loading && { color: '#888' }]}>Share</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, !isStory && styles.toggleBtnActive]}
                            onPress={() => { setIsStory(false); if (imageUrls.length > 10) setImageUrls(imageUrls.slice(0, 10)); }}
                        >
                            <Text style={[styles.toggleText, !isStory && styles.toggleTextActive]}>Feed Post</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, isStory && styles.toggleBtnActive]}
                            onPress={() => { setIsStory(true); if (imageUrls.length > 1) setImageUrls([imageUrls[0]]); }}
                        >
                            <Text style={[styles.toggleText, isStory && styles.toggleTextActive]}>Story</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={pickImage} style={styles.imagePickerContainer}>
                        {imageUrls.length > 0 ? (
                            <View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {imageUrls.map((uri, index) => (
                                        <View key={index} style={styles.previewWrapper}>
                                            <Image source={{ uri }} style={styles.previewImage} />
                                            <TouchableOpacity
                                                style={styles.removeImageBtn}
                                                onPress={() => setImageUrls(imageUrls.filter((_, i) => i !== index))}
                                            >
                                                <X color="#fff" size={16} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    {imageUrls.length < (isStory ? 1 : 10) && (
                                        <TouchableOpacity style={styles.addMoreBtn} onPress={pickImage}>
                                            <Camera color="#888" size={32} />
                                            <Text style={styles.addMoreText}>Add</Text>
                                        </TouchableOpacity>
                                    )}
                                </ScrollView>
                                <Text style={styles.changeImageText}>
                                    {isStory ? 'Change Image' : 'Select More (up to 10)'}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Camera color="#888" size={48} />
                                <Text style={styles.placeholderText}>Select {isStory ? 'Story' : 'from Gallery'}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Removed raw imageUrl input for S3 integration */}

                    {!isStory && (
                        <TextInput
                            style={styles.captionInput}
                            placeholder="Write a caption..."
                            placeholderTextColor="#aaa"
                            value={caption}
                            onChangeText={setCaption}
                            multiline={true}
                        />
                    )}
                </View>
                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#000" />
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginTop: Platform.OS === 'ios' ? 50 : 30,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    shareText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: 'bold',
    },
    content: {
        padding: 16,
    },
    imagePickerContainer: {
        marginBottom: 16,
    },
    imageUrlInput: {
        height: 45,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
        color: '#000',
    },
    previewImage: {
        width: 150,
        height: 150,
        borderRadius: 8,
    },
    previewWrapper: {
        marginRight: 10,
    },
    removeImageBtn: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        padding: 4,
    },
    addMoreBtn: {
        width: 150,
        height: 150,
        backgroundColor: '#f8f8f8',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addMoreText: {
        fontSize: 12,
        color: '#888',
        marginTop: 5,
    },
    toggleContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        padding: 4,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 18,
    },
    toggleBtnActive: {
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#888',
    },
    toggleTextActive: {
        color: '#007AFF',
    },
    changeImageText: {
        textAlign: 'center',
        color: '#007AFF',
        marginBottom: 10,
        fontWeight: '600',
    },
    placeholderImage: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#f8f8f8',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: 10,
        color: '#888',
        fontSize: 14,
    },
    captionInput: {
        fontSize: 16,
        height: 100,
        textAlignVertical: 'top',
        color: '#000',
        paddingTop: 8,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default CreatePostModal;
