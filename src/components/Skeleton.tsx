import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

function SkeletonBox({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.light.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function PostCardSkeleton() {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <SkeletonBox width={40} height={40} borderRadius={20} />
        <View style={styles.headerText}>
          <SkeletonBox width={120} height={14} />
          <SkeletonBox width={80} height={12} style={{ marginTop: 6 }} />
        </View>
      </View>
      {/* Content */}
      <SkeletonBox width="100%" height={14} style={{ marginTop: 12 }} />
      <SkeletonBox width="85%" height={14} style={{ marginTop: 8 }} />
      <SkeletonBox width="60%" height={14} style={{ marginTop: 8 }} />
      {/* Image */}
      <SkeletonBox width="100%" height={200} borderRadius={12} style={{ marginTop: 12 }} />
      {/* Actions */}
      <View style={styles.actions}>
        <SkeletonBox width={60} height={24} />
        <SkeletonBox width={60} height={24} />
        <SkeletonBox width={60} height={24} />
        <SkeletonBox width={24} height={24} />
      </View>
    </View>
  );
}

export function FeedSkeleton() {
  return (
    <View>
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.light.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingRight: 8,
  },
});

export default SkeletonBox;
