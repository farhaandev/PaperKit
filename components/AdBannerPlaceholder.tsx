import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AdBannerPlaceholder(): React.JSX.Element {
  return (
    <SafeAreaView edges={['bottom']} className="bg-slate-950 border-t border-slate-900">
      <View className="h-14 w-full items-center justify-center px-4 bg-slate-900/40">
        <View className="w-full h-11 rounded-lg border border-dashed border-slate-800 items-center justify-center bg-slate-950/40">
          <Text className="text-slate-600 text-[10px] font-mono tracking-wider uppercase">
            Ad Space Reserved (320x50 Banner)
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
