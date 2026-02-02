import React, { useState } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, ImageProps, ImageStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface SmartImageProps extends ImageProps {
    containerStyle?: ViewStyle;
}

export const SmartImage: React.FC<SmartImageProps> = ({
    style,
    containerStyle,
    source,
    ...props
}) => {
    const { colors } = useTheme();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    return (
        <View style={[styles.container, containerStyle]}>
            <Image
                style={[style as ImageStyle, error && { opacity: 0 }]}
                source={source}
                onLoadStart={() => {
                    setLoading(true);
                    setError(false);
                }}
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                    setLoading(false);
                    setError(true);
                }}
                {...props}
            />

            {loading && (
                <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.border }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            )}

            {error && (
                <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.border }]}>
                    <Ionicons name="person" size={(style as any)?.width / 2 || 24} color={colors.textSecondary} />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        position: 'relative',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
