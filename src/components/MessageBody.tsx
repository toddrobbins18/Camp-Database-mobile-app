import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { theme } from '../theme/theme';
import {
  parseMessageHtmlBlocks,
  shouldRenderMessageAsHtml,
} from '../lib/messageContentUtils';

interface MessageBodyProps {
  content: string;
  senderId?: string | null;
  notificationType?: string | null;
  style?: TextStyle;
}

export function MessageBody({ content, senderId, notificationType, style }: MessageBodyProps) {
  const renderHtml = shouldRenderMessageAsHtml(content, { senderId, notificationType });

  if (!renderHtml) {
    return <Text style={[styles.plain, style]}>{content}</Text>;
  }

  const blocks = parseMessageHtmlBlocks(content);

  return (
    <Text style={[styles.plain, style]}>
      {blocks.map((block, i) => {
        if (block.kind === 'heading') {
          return (
            <Text
              key={i}
              style={block.level === 2 ? styles.h2 : styles.h3}
            >
              {block.text}
              {'\n\n'}
            </Text>
          );
        }
        if (block.kind === 'bullet') {
          return (
            <Text key={i} style={styles.bullet}>
              {'• '}
              {block.text}
              {'\n'}
            </Text>
          );
        }
        return (
          <Text key={i} style={styles.paragraph}>
            {block.text}
            {'\n\n'}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  plain: {
    ...theme.typography.body,
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  h2: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 24,
  },
  h3: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 22,
  },
  paragraph: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  bullet: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
    paddingLeft: 4,
  },
});
