import '../global.css';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from '@/db';
import { ensureDirectoriesExist } from '@/utils';

export default function RootLayout(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare(): Promise<void> {
      try {
        await Promise.all([
          initDatabase(),
          ensureDirectoriesExist(),
        ]);
      } catch (error) {
        console.warn('[RootLayout] Initialization error:', error);
      } finally {
        setIsReady(true);
      }
    }

    void prepare();
  }, []);

  if (!isReady) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View className="flex-1 bg-slate-950 items-center justify-center">
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0f172a',
          },
          headerTintColor: '#f8fafc',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: '#020617',
          },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="tools/images-to-pdf"
          options={{
            title: 'Images to PDF',
          }}
        />
        <Stack.Screen
          name="tools/merge-pdf"
          options={{
            title: 'Merge PDFs',
          }}
        />
        <Stack.Screen
          name="tools/compress"
          options={{
            title: 'Compress File',
          }}
        />
        <Stack.Screen
          name="tools/e-sign"
          options={{
            title: 'E-Sign Document',
          }}
        />
        <Stack.Screen
          name="export-success"
          options={{
            title: 'File Ready',
            presentation: 'card',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
