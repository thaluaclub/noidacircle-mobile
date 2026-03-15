import React from 'react';
import { View, StyleSheet } from 'react-native';

interface OnlineIndicatorProps {
  isOnline?: boolean;
  lastSeenAt?: string;
  size?: number;
}

export default function OnlineIndicator({
  isOnline = false,
  lastSeenAt,
  size = 12,
}: OnlineIndicatorProps) {
  // User is considered online if isOnline is true and lastSeenAt is within last 5 minutes
  const isUserOnline = (): boolean => {
    if (!isOnline) return false;
    if (!lastSeenAt) return isOnline;

    const lastSeen = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    return diffMinutes <= 5;
  };

  const onlineStatus = isUserOnline();
  const indicatorColor = onlineStatus ? '#31a24c' : '#b0b3b8';

  return (
    <View
      style={[
        styles.indicator,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: indicatorColor,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  indicator: {
    borderWidth: 2,
    borderColor: '#fff',
  },
});
