import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';
import type { ParentPortalColors } from '../../lib/parentPortalTheme';

export type ChatAppearance = 'nest' | 'parentGlass';

export function isParentPortalThreadStarter(
  row: { id: string; content?: string | null },
  rootId: string,
): boolean {
  if (row.id !== rootId) return false;
  const text = String(row.content ?? '').trim();
  return text.startsWith('Parent portal thread for');
}

export function createChatThreadStyles(
  appearance: ChatAppearance,
  portalColors?: ParentPortalColors,
) {
  if (appearance === 'parentGlass' && portalColors) {
    return StyleSheet.create({
      flex1: { flex: 1 },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: portalColors.brand,
        paddingHorizontal: 4,
        paddingBottom: 10,
      },
      backBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
      },
      headerCenter: { flex: 1, paddingHorizontal: 4 },
      headerName: { fontSize: 17, fontWeight: '600', color: '#fff' },
      headerSubject: { fontSize: 12, color: 'rgba(255,255,255,0.88)', marginTop: 1 },
      headerSpacer: { width: 44 },
      chatScroll: {
        flex: 1,
        minHeight: 0,
        backgroundColor: portalColors.bg,
      },
      chatContent: {
        paddingHorizontal: 12,
        paddingVertical: 14,
        gap: 8,
      },
      chatContentEmpty: {
        flexGrow: 1,
      },
      chatContentFilled: {
        flexGrow: 0,
        paddingBottom: 20,
      },
      bubbleRow: { width: '100%', marginVertical: 3 },
      bubbleRowMe: { alignItems: 'flex-end' },
      bubbleRowThem: { alignItems: 'flex-start' },
      bubble: {
        maxWidth: '84%',
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 8,
        borderRadius: 20,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      },
      bubbleMe: {
        backgroundColor: 'rgba(255,255,255,0.78)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.92)',
        borderTopRightRadius: 6,
      },
      bubbleThem: {
        backgroundColor: 'rgba(255,255,255,0.52)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.72)',
        borderTopLeftRadius: 6,
      },
      bubbleSender: {
        fontSize: 12,
        fontWeight: '600',
        color: portalColors.brandDark,
        marginBottom: 4,
      },
      bubbleMeta: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 6,
      },
      bubbleTime: { fontSize: 11, color: portalColors.textMuted },
    });
  }

  return StyleSheet.create({
    flex1: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 4,
      paddingBottom: 10,
    },
    backBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: { flex: 1, paddingHorizontal: 4 },
    headerName: { fontSize: 17, fontWeight: '600', color: '#fff' },
    headerSubject: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
    headerSpacer: { width: 44 },
    chatScroll: { flex: 1, minHeight: 0, backgroundColor: theme.colors.background },
    chatContent: { paddingHorizontal: 10, paddingVertical: 12, gap: 4 },
    chatContentEmpty: { flexGrow: 1 },
    chatContentFilled: { flexGrow: 0, paddingBottom: 16 },
    bubbleRow: { width: '100%', marginVertical: 2 },
    bubbleRowMe: { alignItems: 'flex-end' },
    bubbleRowThem: { alignItems: 'flex-start' },
    bubble: {
      maxWidth: '82%',
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 6,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 1,
      elevation: 1,
    },
    bubbleMe: {
      backgroundColor: '#eff6ff',
      borderWidth: 1,
      borderColor: '#bfdbfe',
      borderTopRightRadius: 4,
    },
    bubbleThem: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderTopLeftRadius: 4,
    },
    bubbleSender: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.secondary,
      marginBottom: 4,
    },
    bubbleMeta: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 4,
    },
    bubbleTime: { fontSize: 11, color: theme.colors.textSecondary },
  });
}
