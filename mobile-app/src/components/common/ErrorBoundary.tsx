import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import * as Sentry from '@sentry/react-native';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
            Sentry.captureException(error, { extra: { errorInfo } });
        }
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.content}>
                        <Text style={styles.title}>Oops! Something went wrong.</Text>
                        <Text style={styles.message}>
                            The app encountered an unexpected error. We've been notified and are looking into it.
                        </Text>

                        <ScrollView style={styles.errorContainer}>
                            <Text style={styles.errorText}>
                                {this.state.error?.toString() || 'Unknown error'}
                            </Text>
                        </ScrollView>

                        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#1f2937',
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#4b5563',
        textAlign: 'center',
        marginBottom: 24,
    },
    errorContainer: {
        maxHeight: 200,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        padding: 12,
        width: '100%',
        marginBottom: 24,
    },
    errorText: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#ef4444',
    },
    button: {
        backgroundColor: '#6366f1',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ErrorBoundary;
