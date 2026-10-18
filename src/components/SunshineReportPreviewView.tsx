import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  SUNSHINE_TEMPLATE_HEIGHT,
  SUNSHINE_TEMPLATE_WIDTH,
  sunshinePreviewOverlayItems,
  type SunshinePreviewInput,
} from '../lib/sunshineLayout';

const TEMPLATE = require('../../assets/nsdc-sunshine-report-template.jpg');

type Props = SunshinePreviewInput & { scale?: number };

export function SunshineReportPreviewView({
  camperName,
  activities,
  sports,
  lunch,
  bm,
  napped,
  scale: scaleProp,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const scale = scaleProp ?? Math.min(1, (windowWidth - 32) / SUNSHINE_TEMPLATE_WIDTH);
  const overlay = useMemo(
    () => sunshinePreviewOverlayItems({ camperName, activities, sports, lunch, bm, napped }),
    [camperName, activities, sports, lunch, bm, napped],
  );

  const w = SUNSHINE_TEMPLATE_WIDTH * scale;
  const h = SUNSHINE_TEMPLATE_HEIGHT * scale;

  const textStyle = (
    item: {
      x: number;
      top: number;
      fontSize: number;
      maxWidth?: number;
      fontWeight: '600' | '700' | '800';
      color: string;
    },
    text: string,
  ) => (
    <Text
      key={`${text}-${item.x}-${item.top}`}
      numberOfLines={1}
      ellipsizeMode="tail"
      style={{
        position: 'absolute',
        left: item.x * scale,
        top: item.top * scale,
        width: item.maxWidth ? item.maxWidth * scale : undefined,
        fontSize: item.fontSize * scale,
        fontWeight: item.fontWeight,
        color: item.color,
        lineHeight: item.fontSize * scale,
      }}
    >
      {text}
    </Text>
  );

  return (
    <View style={[styles.frame, { width: w, height: h }]}>
      <Image source={TEMPLATE} style={{ width: w, height: h }} resizeMode="stretch" />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {textStyle(overlay.camper, overlay.camper.text)}
        {overlay.activities.map((line) => textStyle(line, line.text))}
        {overlay.sports.map((line) => textStyle(line, line.text))}
        {overlay.lunch.map((line) => textStyle(line, line.text))}
        {overlay.bmCheck ? textStyle(overlay.bmCheck, overlay.bmCheck.text) : null}
        {overlay.napCheck ? textStyle(overlay.napCheck, overlay.napCheck.text) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
});
