import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const VIDEO_WIDTH = SCREEN_WIDTH - 32;

// We'll dynamically import expo-video to avoid crashes if not installed
let VideoView: any = null;
let useVideoPlayer: any = null;

try {
  const expoVideo = require('expo-video');
  VideoView = expoVideo.VideoView;
  useVideoPlayer = expoVideo.useVideoPlayer;
} catch {
  // expo-video not available
}

interface AutoPlayVideoProps {
  uri: string;
  isVisible: boolean;
  dark?: boolean;
  height?: number;
}

function AutoPlayVideo({ uri, isVisible, dark = false, height = 300 }: AutoPlayVideoProps) {
  const [muted, setMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);

  // If expo-video is not installed, show a placeholder
  if (!useVideoPlayer || !VideoView) {
    return (
      <View style={[styles.container, { height, backgroundColor: '#1a1a1a' }]}>
        <Ionicons name="videocam" size={40} color="rgba(255,255,255,0.5)" />
      </View>
    );
  }

  // Use the expo-video hook
  const player = useVideoPlayer(uri, (p: any) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  // Auto play/pause based on visibility
  useEffect(() => {
    if (!player) return;
    if (isVisible) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, player]);

  // Toggle mute
  useEffect(() => {
    if (player) {
      player.muted = muted;
    }
  }, [muted, player]);

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev);
  }, []);

  const toggleControls = useCallback(() => {
    setShowControls(prev => !prev);
    // Auto-hide controls after 3 seconds
    setTimeout(() => setShowControls(false), 3000);
  }, []);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={toggleControls}
      style={[styles.container, { height }]}
    >
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Mute button - always visible */}
      <TouchableOpacity style={styles.muteBtn} onPress={toggleMute} activeOpacity={0.7}>
        <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={18} color="#fff" />
      </TouchableOpacity>

      {/* Play/Pause overlay */}
      {showControls && (
        <View style={styles.controlsOverlay}>
          <TouchableOpacity
            onPress={() => {
              if (player) {
                if (isVisible) {
                  player.pause();
                } else {
                  player.play();
                }
              }
            }}
          >
            <Ionicons name={isVisible ? 'pause' : 'play'} size={48} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default memo(AutoPlayVideo);

const styles = StyleSheet.create({
  container: {
    width: VIDEO_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  muteBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});
