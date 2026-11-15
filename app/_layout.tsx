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
          headerShown: false,
          contentStyle: { backgroundColor: '#020617' },
        }}
      />
    </SafeAreaProvider>
  );
}
