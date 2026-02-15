import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Image, ActivityIndicator, Platform } from 'react-native';
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
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const { token } = useAuth();

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUrl(result.assets[0].uri);
        }
    };

    const handleCreatePost = async () => {
        if (!imageUrl) {
            alert('Please select an image');
            return;
        }
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('caption', caption);

            // Create file object for FormData
            const filename = imageUrl.split('/').pop();
            const match = /\.(\w+)$/.exec(filename || '');
            const type = match ? `image/${match[1]}` : `image`;

            formData.append('image', {
                uri: imageUrl,
                name: filename,
                type: type,
            } as any);

            await axios.post(`${API_URL}/api/posts`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                },
            });
            setCaption('');
            setImageUrl('');
            onPostCreated();
            onClose();
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post');
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
                    <TouchableOpacity onPress={pickImage} style={styles.imagePickerContainer}>
                        {imageUrl ? (
                            <View>
                                <Image source={{ uri: imageUrl }} style={styles.previewImage} />
                                <Text style={styles.changeImageText}>Change Image</Text>
                            </View>
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Camera color="#888" size={48} />
                                <Text style={styles.placeholderText}>Select from Gallery</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Removed raw imageUrl input for S3 integration */}

                    <TextInput
                        style={styles.captionInput}
                        placeholder="Write a caption..."
                        placeholderTextColor="#aaa"
                        value={caption}
                        onChangeText={setCaption}
                        multiline={true}
                    />
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
        width: '100%',
        aspectRatio: 1,
        borderRadius: 8,
        marginBottom: 8,
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
