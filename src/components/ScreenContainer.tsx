import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

type ScreenContainerProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Default: top + sides only (drawer screens — avoid stacking with home indicator). */
  edges?: Edge[];
};

/**
 * Standard root for drawer screens — one safe-area pass (top/sides), not double with navigator wrappers.
 */
export function ScreenContainer({
  children,
  style,
  edges = ['top', 'left', 'right'],
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={[styles.root, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
