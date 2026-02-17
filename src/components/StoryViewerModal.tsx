import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Image, StyleSheet, TouchableOpacity, Dimensions, Animated, SafeAreaView } from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

const { width, height } = Dimensions.get('window');

interface StoryViewerProps {
    visible: boolean;
    stories: any[];
    initialIndex: number;
    onClose: () => void;
}

const getPublicUrl = (url: string) => {
    if (!url) return url;
    if (url.includes('storage.supabase.co')) {
        return url.replace('.storage.supabase.co/', '.supabase.co/storage/v1/object/public/');
    }
    return url;
};

const StoryViewerModal: React.FC<StoryViewerProps> = ({ visible, stories, initialIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const progress = React.useRef(new Animated.Value(0)).current;
    const { theme } = useTheme();

    useEffect(() => {
        if (visible) {
            setCurrentIndex(initialIndex);
            startProgress();
        } else {
            progress.setValue(0);
        }
    }, [visible, initialIndex]);

    const startProgress = () => {
        progress.setValue(0);
        Animated.timing(progress, {
            toValue: 1,
            duration: 5000,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished) {
                handleNext();
            }
        });
    };

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
            startProgress();
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            startProgress();
        }
    };

    if (!stories[currentIndex]) return null;

    const currentStory = stories[currentIndex];

    return (
        <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                <View style={styles.progressBarContainer}>
                    {stories.map((_, index) => (
                        <View key={index} style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                            <Animated.View
                                style={[
                                    styles.progressFill,
                                    {
                                        backgroundColor: '#fff',
                                        width: index === currentIndex
                                            ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                                            : index < currentIndex ? '100%' : '0%'
                                    }
                                ]}
                            />
                        </View>
                    ))}
                </View>

                <View style={styles.header}>
                    <View style={styles.userInfo}>
                        <Image source={{ uri: getPublicUrl(currentStory.user.avatar) || 'https://via.placeholder.com/32' }} style={styles.avatar} />
                        <Text style={styles.username}>{currentStory.user.username}</Text>
                        <Text style={styles.timeText}>{new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X color="#fff" size={28} />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <Image source={{ uri: getPublicUrl(currentStory.imageUrl) }} style={styles.storyImage} resizeMode="cover" />

                    <View style={styles.navigationOverlay}>
                        <TouchableOpacity style={styles.navSection} onPress={handlePrev} />
                        <TouchableOpacity style={styles.navSection} onPress={handleNext} />
                    </View>
                </View>

                {currentIndex > 0 && (
                    <TouchableOpacity style={[styles.navButton, styles.prevButton]} onPress={handlePrev}>
                        <ChevronLeft color="#fff" size={32} />
                    </TouchableOpacity>
                )}

                {currentIndex < stories.length - 1 && (
                    <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={handleNext}>
                        <ChevronRight color="#fff" size={32} />
                    </TouchableOpacity>
                )}
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    progressBarContainer: {
        flexDirection: 'row',
        paddingHorizontal: 10,
        paddingTop: 10,
        position: 'absolute',
        top: 40,
        width: '100%',
        zIndex: 10,
    },
    progressTrack: {
        flex: 1,
        height: 2,
        marginHorizontal: 2,
        borderRadius: 1,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        position: 'absolute',
        top: 60,
        width: '100%',
        zIndex: 10,
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
        borderWidth: 1,
        borderColor: '#fff',
    },
    username: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    timeText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginLeft: 8,
    },
    closeButton: {
        padding: 5,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    storyImage: {
        width: width,
        height: height,
    },
    navigationOverlay: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
    },
    navSection: {
        flex: 1,
    },
    navButton: {
        position: 'absolute',
        top: '50%',
        backgroundColor: 'rgba(0,0,0,0.3)',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -22,
    },
    prevButton: {
        left: 10,
    },
    nextButton: {
        right: 10,
    },
});

export default StoryViewerModal;
