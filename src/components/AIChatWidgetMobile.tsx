import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { theme } from '../theme/theme';
import { useCompany } from '../contexts/CompanyContext';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type InvokeErrorWithContext = Error & {
  context?: {
    status?: number;
    body?: string;
    json?: () => Promise<{ error?: string; message?: string }>;
  };
};

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    'Hi! I can help you find information about campers, staff, incidents, events, and more. What would you like to know?',
};

export function AIChatWidgetMobile() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { companyId } = useCompany();

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: prompt };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);
    scrollToBottom();

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          viewingCompanyId: companyId,
        },
      });

      if (error) {
        const msg = await getFunctionErrorMessage(error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `I apologize, but I encountered an error.\n\n${msg}`,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data?.message || 'I apologize, but I could not generate a response.',
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I apologize, but I could not connect to the service.\n\n${err?.message || 'Network or edge function error.'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  return (
    <>
      {!isOpen && (
        <TouchableOpacity style={styles.fab} onPress={() => setIsOpen(true)} activeOpacity={0.85}>
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardWrap}
          >
            <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Ionicons name="chatbubble-outline" size={20} color={theme.colors.text} />
                  <Text style={styles.headerTitle}>AI Assistant</Text>
                </View>
                <TouchableOpacity onPress={() => setIsOpen(false)}>
                  <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={scrollRef}
                style={styles.messages}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((message, idx) => (
                  <View
                    key={`${message.role}-${idx}`}
                    style={[
                      styles.messageRow,
                      message.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
                          message.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                        ]}
                      >
                        {message.content}
                      </Text>
                    </View>
                  </View>
                ))}
                {isLoading && (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                    <Text style={styles.loadingText}>Thinking...</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask me anything..."
                  placeholderTextColor={theme.colors.textSecondary}
                  editable={!isLoading}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={!canSend}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  const err = error as InvokeErrorWithContext;
  const fallback = err?.message || 'Failed to get AI response.';

  try {
    if (err?.context?.json) {
      const payload = await err.context.json();
      const detailed = payload?.error || payload?.message;
      if (detailed) return detailed;
    }
  } catch {
    // ignore parse errors and continue fallbacks
  }

  try {
    if (err?.context?.body) {
      const asJson = JSON.parse(err.context.body) as { error?: string; message?: string };
      if (asJson?.error || asJson?.message) return asJson.error || asJson.message || fallback;
      if (err.context.body.length < 240) return err.context.body;
    }
  } catch {
    // body is not JSON; ignore
  }

  if (err?.context?.status) {
    return `${fallback} (status ${err.context.status})`;
  }
  return fallback;
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 50,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  keyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  panel: {
    width: '92%',
    maxWidth: 380,
    height: '82%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
    gap: 10,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '86%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleUser: {
    backgroundColor: '#2563eb',
  },
  bubbleAssistant: {
    backgroundColor: '#eef2f7',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#fff',
  },
  bubbleTextAssistant: {
    color: theme.colors.text,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  inputRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});
