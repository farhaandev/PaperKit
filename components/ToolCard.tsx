import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

export interface ToolCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badgeBgColor: string;
  badgeBorderColor: string;
  accentBarColor: string;
  onPress: () => void;
}

export function ToolCard({
  title,
  subtitle,
  icon,
  badgeBgColor,
  badgeBorderColor,
  accentBarColor,
  onPress,
}: ToolCardProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 justify-between min-h-[120px] shadow-sm relative overflow-hidden"
      android_ripple={{ color: 'rgba(255, 255, 255, 0.05)', borderless: false }}
    >
      {/* Decorative top accent indicator line */}
      <View className={`absolute top-0 left-0 right-0 h-1 ${accentBarColor}`} />

      <View className="flex-row items-center justify-between mb-3">
        <View
          className={`w-11 h-11 rounded-xl items-center justify-center border ${badgeBgColor} ${badgeBorderColor}`}
        >
          {icon}
        </View>
        <View className="w-6 h-6 rounded-full bg-slate-800/60 items-center justify-center">
          <ChevronRight size={14} color="#64748b" />
        </View>
      </View>

      <View>
        <Text
          numberOfLines={1}
          className="text-white font-bold text-sm tracking-tight"
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          className="text-slate-400 text-[11px] mt-0.5 leading-tight"
        >
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
