import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import {
  mediaFolders,
  mockCamperFaces,
  mockPhotos,
  PHOTO_COLORS,
  type MediaPhoto,
} from '../constants/mediaMockData';

type TabId = 'gallery' | 'faces' | 'parent-search';
type ViewMode = 'grid' | 'list';

type UploadedPhoto = {
  id: string;
  url: string;
  name: string;
  folder: string;
  date: string;
};

export function MediaScreen({ navigation }: any) {
  const { companyId } = useCompany();
  const [activeTab, setActiveTab] = useState<TabId>('gallery');
  const [selectedFolder, setSelectedFolder] = useState('All Photos');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPhoto, setSelectedPhoto] = useState<MediaPhoto | null>(null);
  const [faceSearch, setFaceSearch] = useState('');
  const [scanningProgress, setScanningProgress] = useState<number | null>(null);
  const [selectedCamper, setSelectedCamper] = useState<string | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadUploaded = useCallback(async () => {
    if (!companyId) {
      setUploadedPhotos([]);
      return;
    }
    const { data } = await supabase
      .from('media')
      .select('id, file_name, file_url, folder, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    setUploadedPhotos(
      (data ?? []).map((r: { id: string; file_name: string; file_url: string; folder: string | null; created_at: string }) => ({
        id: r.id,
        url: r.file_url,
        name: r.file_name,
        folder: r.folder ?? 'All Photos',
        date: new Date(r.created_at).toLocaleDateString(),
      })),
    );
  }, [companyId]);

  useEffect(() => {
    void loadUploaded();
  }, [loadUploaded]);

  const filteredPhotos = useMemo(
    () =>
      mockPhotos.filter((p) => {
        const matchesFolder = selectedFolder === 'All Photos' || p.folder === selectedFolder;
        const matchesSearch =
          search === '' ||
          p.taggedCampers.some((c) => c.toLowerCase().includes(search.toLowerCase())) ||
          p.alt.toLowerCase().includes(search.toLowerCase());
        const matchesCamper = !selectedCamper || p.taggedCampers.includes(selectedCamper);
        return matchesFolder && matchesSearch && matchesCamper;
      }),
    [search, selectedCamper, selectedFolder],
  );

  const filteredFaces = useMemo(
    () => mockCamperFaces.filter((c) => c.name.toLowerCase().includes(faceSearch.toLowerCase())),
    [faceSearch],
  );

  const taggedCount = mockPhotos.filter((p) => p.tagStatus === 'tagged').length;
  const pendingCount = mockPhotos.filter((p) => p.tagStatus === 'pending').length;
  const untaggedCount = mockPhotos.filter((p) => p.tagStatus === 'untagged').length;

  const handleRunScan = () => {
    setScanningProgress(0);
    const interval = setInterval(() => {
      setScanningProgress((prev) => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          setScanningProgress(null);
          Alert.alert('Scan complete', `Identified faces in ${pendingCount + untaggedCount} new photos.`);
          return null;
        }
        return prev + 8;
      });
    }, 200);
  };

  const handleUpload = async () => {
    if (!companyId) {
      Alert.alert('No camp selected', 'Select a camp before uploading photos.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled || !result.assets?.length) return;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        Alert.alert('Not signed in', 'Please sign in to upload photos.');
        return;
      }

      setUploading(true);
      const targetFolder = selectedFolder === 'All Photos' ? 'Uncategorized' : selectedFolder;
      let successCount = 0;

      for (const asset of result.assets) {
        const fileName = asset.name ?? `photo-${Date.now()}.jpg`;
        const ext = fileName.split('.').pop() ?? 'jpg';
        const path = `${companyId}/${userData.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const response = await fetch(asset.uri);
        const arrayBuffer = await response.arrayBuffer();

        const { error: upErr } = await supabase.storage.from('camp-media').upload(path, arrayBuffer, {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: false,
        });
        if (upErr) {
          Alert.alert(`Upload failed: ${fileName}`, upErr.message);
          continue;
        }

        const { data: pub } = supabase.storage.from('camp-media').getPublicUrl(path);
        const { error: dbErr } = await supabase.from('media').insert({
          company_id: companyId,
          file_name: fileName,
          file_url: pub.publicUrl,
          folder: targetFolder,
          uploaded_by: userData.user.id,
        });
        if (dbErr) {
          Alert.alert(`Saved to storage but DB error: ${fileName}`, dbErr.message);
          continue;
        }
        successCount++;
      }

      if (successCount > 0) {
        Alert.alert(
          'Upload complete',
          `${successCount} photo${successCount > 1 ? 's' : ''} uploaded to ${targetFolder}.`,
        );
        void loadUploaded();
      }
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  const initials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('');

  const renderPhotoGridItem = (p: MediaPhoto) => (
    <TouchableOpacity
      key={p.id}
      style={[styles.photoTile, { backgroundColor: PHOTO_COLORS[p.colorKey] ?? '#f1f5f9' }]}
      onPress={() => setSelectedPhoto(p)}
      activeOpacity={0.85}
    >
      <Ionicons name="camera-outline" size={24} color="#94a3b8" style={styles.photoTileIcon} />
      <View style={styles.photoStatus}>
        {p.tagStatus === 'tagged' && <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />}
        {p.tagStatus === 'pending' && <Ionicons name="time-outline" size={16} color={theme.colors.warning} />}
      </View>
      {p.taggedCampers.length > 0 && (
        <View style={styles.photoTagOverlay}>
          <Ionicons name="pricetag-outline" size={10} color="#fff" />
          <Text style={styles.photoTagText} numberOfLines={1}>
            {p.taggedCampers.slice(0, 2).join(', ')}
            {p.taggedCampers.length > 2 ? ` +${p.taggedCampers.length - 2}` : ''}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderGalleryTab = () => (
    <View style={styles.tabBody}>
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by camper name or tag..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons name="grid-outline" size={16} color={viewMode === 'grid' ? theme.colors.secondary : theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? theme.colors.secondary : theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {selectedCamper && (
        <TouchableOpacity style={styles.camperChip} onPress={() => setSelectedCamper(null)}>
          <Ionicons name="person-outline" size={12} color={theme.colors.text} />
          <Text style={styles.camperChipText}>{selectedCamper}</Text>
          <Ionicons name="close" size={12} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.folderScroll}>
        {mediaFolders.map((f) => {
          const count = f === 'All Photos' ? mockPhotos.length : mockPhotos.filter((p) => p.folder === f).length;
          const active = selectedFolder === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.folderPill, active && styles.folderPillActive]}
              onPress={() => setSelectedFolder(f)}
            >
              <Ionicons name="folder-open-outline" size={12} color={active ? '#fff' : theme.colors.textSecondary} />
              <Text style={[styles.folderPillText, active && styles.folderPillTextActive]}>{f}</Text>
              <View style={[styles.folderCount, active && styles.folderCountActive]}>
                <Text style={[styles.folderCountText, active && styles.folderCountTextActive]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {uploadedPhotos.length > 0 && (
        <View style={styles.uploadsSection}>
          <View style={styles.uploadsHeader}>
            <Text style={styles.uploadsTitle}>Your uploads</Text>
            <View style={styles.uploadsBadge}>
              <Text style={styles.uploadsBadgeText}>{uploadedPhotos.length}</Text>
            </View>
          </View>
          <View style={styles.photoGrid}>
            {uploadedPhotos
              .filter((p) => selectedFolder === 'All Photos' || p.folder === selectedFolder)
              .map((p) => (
                <TouchableOpacity key={p.id} style={styles.uploadTile} onPress={() => Linking.openURL(p.url)}>
                  <Image source={{ uri: p.url }} style={styles.uploadImage} />
                </TouchableOpacity>
              ))}
          </View>
        </View>
      )}

      {viewMode === 'grid' ? (
        <View style={styles.photoGrid}>{filteredPhotos.map(renderPhotoGridItem)}</View>
      ) : (
        <View style={styles.listWrap}>
          {filteredPhotos.map((p) => (
            <TouchableOpacity key={p.id} style={styles.listRow} onPress={() => setSelectedPhoto(p)}>
              <View style={[styles.listThumb, { backgroundColor: PHOTO_COLORS[p.colorKey] ?? '#f1f5f9' }]}>
                <Ionicons name="camera-outline" size={16} color="#94a3b8" />
              </View>
              <View style={styles.listMeta}>
                <Text style={styles.listTitle}>Photo {p.id}</Text>
                <Text style={styles.listSub}>
                  {p.folder} · {p.uploadDate}
                </Text>
              </View>
              <View style={styles.listBadges}>
                {p.taggedCampers.length > 0 && (
                  <View style={styles.listCountBadge}>
                    <Text style={styles.listCountText}>{p.taggedCampers.length}</Text>
                  </View>
                )}
                {p.tagStatus === 'tagged' && <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />}
                {p.tagStatus === 'pending' && <Ionicons name="time-outline" size={16} color={theme.colors.warning} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {filteredPhotos.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>No photos found</Text>
        </View>
      )}
    </View>
  );

  const renderFacesTab = () => (
    <View style={styles.tabBody}>
      <View style={styles.statsGrid}>
        {[
          { label: 'Auto-Tagged', value: taggedCount, icon: 'checkmark-circle-outline' as const, color: theme.colors.success, bg: '#dcfce7' },
          { label: 'Pending Review', value: pendingCount, icon: 'time-outline' as const, color: theme.colors.warning, bg: '#fef3c7' },
          { label: 'Untagged', value: untaggedCount, icon: 'images-outline' as const, color: theme.colors.textSecondary, bg: '#f1f5f9' },
          { label: 'Known Faces', value: mockCamperFaces.length, icon: 'scan-outline' as const, color: theme.colors.secondary, bg: '#dbeafe' },
        ].map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: stat.bg }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeaderRow}>
          <Text style={styles.panelTitle}>Recognized Campers</Text>
          <View style={styles.faceSearchWrap}>
            <Ionicons name="search" size={14} color={theme.colors.textSecondary} style={styles.faceSearchIcon} />
            <TextInput
              style={styles.faceSearchInput}
              placeholder="Search camper..."
              value={faceSearch}
              onChangeText={setFaceSearch}
            />
          </View>
        </View>
        {filteredFaces.map((face) => (
          <TouchableOpacity
            key={face.id}
            style={styles.faceRow}
            onPress={() => {
              setSelectedCamper(face.name);
              setActiveTab('gallery');
              Alert.alert('Filtering photos', `Showing photos of ${face.name}`);
            }}
          >
            <View style={styles.faceAvatar}>
              <Text style={styles.faceAvatarText}>{initials(face.name)}</Text>
            </View>
            <View style={styles.faceMeta}>
              <Text style={styles.faceName}>{face.name}</Text>
              <View style={styles.faceSubRow}>
                <Text style={styles.faceCount}>{face.photoCount} photos</Text>
                <View
                  style={[
                    styles.faceStatusBadge,
                    face.status === 'verified' ? styles.faceStatusVerified : styles.faceStatusSuggested,
                  ]}
                >
                  <Text
                    style={[
                      styles.faceStatusText,
                      face.status === 'verified' ? styles.faceStatusTextVerified : styles.faceStatusTextSuggested,
                    ]}
                  >
                    {face.status}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderParentSearchTab = () => (
    <View style={styles.tabBody}>
      <View style={styles.parentCard}>
        <View style={styles.parentIconWrap}>
          <Ionicons name="scan-outline" size={32} color={theme.colors.secondary} />
        </View>
        <Text style={styles.parentTitle}>Parent Photo Search</Text>
        <Text style={styles.parentDesc}>
          Parents can find all photos of their child through the Parent Portal. AI facial recognition automatically
          identifies campers across all uploaded camp photos.
        </Text>

        <View style={styles.parentSteps}>
          {[
            { icon: 'cloud-upload-outline' as const, title: '1. Upload Photos', desc: 'Staff uploads camp photos to the media library' },
            { icon: 'sparkles-outline' as const, title: '2. AI Scans Faces', desc: 'Facial recognition identifies and tags each camper' },
            { icon: 'eye-outline' as const, title: '3. Parents Browse', desc: 'Parents log in to find all photos of their child' },
          ].map((step) => (
            <View key={step.title} style={styles.parentStep}>
              <Ionicons name={step.icon} size={16} color={theme.colors.secondary} />
              <Text style={styles.parentStepTitle}>{step.title}</Text>
              <Text style={styles.parentStepDesc}>{step.desc}</Text>
            </View>
          ))}
        </View>

        <View style={styles.parentSearchSection}>
          <Text style={styles.parentSearchLabel}>Quick preview — search for a camper:</Text>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Type a camper name..."
              value={faceSearch}
              onChangeText={setFaceSearch}
            />
          </View>
          {!!faceSearch &&
            filteredFaces.slice(0, 4).map((face) => (
              <TouchableOpacity
                key={face.id}
                style={styles.parentResultRow}
                onPress={() => {
                  setSelectedCamper(face.name);
                  Alert.alert(face.name, `Found ${face.photoCount} photos`);
                }}
              >
                <View style={styles.parentResultAvatar}>
                  <Text style={styles.parentResultAvatarText}>{initials(face.name)}</Text>
                </View>
                <View>
                  <Text style={styles.parentResultName}>{face.name}</Text>
                  <Text style={styles.parentResultCount}>{face.photoCount} photos found</Text>
                </View>
              </TouchableOpacity>
            ))}
          {!!faceSearch && filteredFaces.length === 0 && (
            <Text style={styles.noCampersText}>No campers found</Text>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="camera-outline" size={22} color="#fff" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Media Library</Text>
          <Text style={styles.headerSubtitle}>Upload photos, auto-tag campers with AI face recognition</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.outlineBtn, scanningProgress !== null && styles.btnDisabled]}
          onPress={handleRunScan}
          disabled={scanningProgress !== null}
        >
          <Ionicons name="scan-outline" size={16} color={theme.colors.text} />
          <Text style={styles.outlineBtnText}>{scanningProgress !== null ? 'Scanning...' : 'Scan Faces'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryBtn, uploading && styles.btnDisabled]} onPress={handleUpload} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
          )}
          <Text style={styles.primaryBtnText}>{uploading ? 'Uploading...' : 'Upload Photos'}</Text>
        </TouchableOpacity>
      </View>

      {scanningProgress !== null && (
        <View style={styles.scanCard}>
          <View style={styles.scanHeader}>
            <Ionicons name="sparkles-outline" size={16} color={theme.colors.secondary} />
            <Text style={styles.scanTitle}>AI Face Recognition in Progress...</Text>
            <Text style={styles.scanPct}>{scanningProgress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${scanningProgress}%` }]} />
          </View>
        </View>
      )}

      <View style={styles.tabs}>
        {(
          [
            { id: 'gallery' as TabId, label: 'Photo Gallery', icon: 'images-outline' as const },
            { id: 'faces' as TabId, label: 'Face Recognition', icon: 'scan-outline' as const },
            { id: 'parent-search' as TabId, label: 'Parent Photo Search', icon: 'search-outline' as const },
          ] as const
        ).map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={14}
              color={activeTab === tab.id ? theme.colors.secondary : theme.colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {activeTab === 'gallery' && renderGalleryTab()}
        {activeTab === 'faces' && renderFacesTab()}
        {activeTab === 'parent-search' && renderParentSearchTab()}
      </ScrollView>

      <Modal visible={!!selectedPhoto} transparent animationType="slide" onRequestClose={() => setSelectedPhoto(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="images-outline" size={20} color={theme.colors.secondary} />
              <Text style={styles.modalTitle}>Photo {selectedPhoto?.id}</Text>
              <TouchableOpacity onPress={() => setSelectedPhoto(null)}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {selectedPhoto && (
              <>
                <View
                  style={[
                    styles.modalPreview,
                    { backgroundColor: PHOTO_COLORS[selectedPhoto.colorKey] ?? '#f1f5f9' },
                  ]}
                >
                  <Ionicons name="camera-outline" size={48} color="#94a3b8" />
                </View>
                <View style={styles.modalMetaRow}>
                  <Ionicons name="folder-open-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.modalMeta}>{selectedPhoto.folder}</Text>
                  <Text style={styles.modalMeta}>·</Text>
                  <Text style={styles.modalMeta}>{selectedPhoto.uploadDate}</Text>
                  <View
                    style={[
                      styles.modalStatusBadge,
                      selectedPhoto.tagStatus === 'tagged'
                        ? styles.modalStatusTagged
                        : selectedPhoto.tagStatus === 'pending'
                          ? styles.modalStatusPending
                          : styles.modalStatusUntagged,
                    ]}
                  >
                    <Text style={styles.modalStatusText}>
                      {selectedPhoto.tagStatus === 'tagged'
                        ? 'Auto-Tagged'
                        : selectedPhoto.tagStatus === 'pending'
                          ? 'Pending Review'
                          : 'Untagged'}
                    </Text>
                  </View>
                </View>
                {selectedPhoto.taggedCampers.length > 0 ? (
                  <View>
                    <Text style={styles.modalSectionTitle}>Recognized Campers</Text>
                    <View style={styles.modalTags}>
                      {selectedPhoto.taggedCampers.map((name) => (
                        <View key={name} style={styles.modalTag}>
                          <View style={styles.modalTagAvatar}>
                            <Text style={styles.modalTagAvatarText}>{initials(name)}</Text>
                          </View>
                          <Text style={styles.modalTagName}>{name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={styles.modalEmptyFaces}>
                    <Ionicons name="scan-outline" size={24} color="#94a3b8" />
                    <Text style={styles.modalEmptyText}>No faces recognized yet</Text>
                    <TouchableOpacity
                      style={styles.modalScanBtn}
                      onPress={() => Alert.alert('Scanning', 'Running face recognition on this photo...')}
                    >
                      <Ionicons name="sparkles-outline" size={14} color={theme.colors.text} />
                      <Text style={styles.modalScanBtnText}>Scan This Photo</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedPhoto(null)}>
                  <Text style={styles.modalCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuButton: { marginRight: 8 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  headerSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  outlineBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: theme.colors.secondary,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  btnDisabled: { opacity: 0.6 },
  scanCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  scanHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  scanTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text },
  scanPct: { fontSize: 12, color: theme.colors.textSecondary },
  progressTrack: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.secondary, borderRadius: 999 },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  tabActive: { backgroundColor: '#dbeafe' },
  tabText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: theme.colors.secondary, fontWeight: '600' },
  content: { flex: 1 },
  tabBody: { padding: 16, paddingBottom: 32 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  searchWrap: { flex: 1, position: 'relative' },
  searchIcon: { position: 'absolute', left: 12, top: 12, zIndex: 1 },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingLeft: 38,
    paddingRight: 12,
    fontSize: 15,
  },
  viewToggle: { flexDirection: 'row', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, overflow: 'hidden' },
  viewToggleBtn: { padding: 8, backgroundColor: '#fff' },
  viewToggleBtnActive: { backgroundColor: '#f1f5f9' },
  camperChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  camperChipText: { fontSize: 12, color: theme.colors.text, fontWeight: '500' },
  folderScroll: { marginBottom: 12 },
  folderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  folderPillActive: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  folderPillText: { fontSize: 11, color: theme.colors.text, fontWeight: '500' },
  folderPillTextActive: { color: '#fff' },
  folderCount: {
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 2,
  },
  folderCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  folderCountText: { fontSize: 10, color: theme.colors.textSecondary, fontWeight: '600' },
  folderCountTextActive: { color: '#fff' },
  uploadsSection: { marginBottom: 16 },
  uploadsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  uploadsTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  uploadsBadge: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  uploadsBadgeText: { fontSize: 10, color: theme.colors.textSecondary, fontWeight: '600' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  photoTileIcon: { position: 'absolute', alignSelf: 'center', top: '40%' },
  photoStatus: { position: 'absolute', top: 6, right: 6 },
  photoTagOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  photoTagText: { flex: 1, fontSize: 9, color: '#fff' },
  uploadTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  uploadImage: { width: '100%', height: '100%' },
  listWrap: { gap: 4 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 4,
  },
  listThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listMeta: { flex: 1 },
  listTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  listSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  listBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listCountBadge: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  listCountText: { fontSize: 10, fontWeight: '600', color: theme.colors.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 8, fontSize: 14, color: theme.colors.textSecondary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statIconWrap: { padding: 8, borderRadius: 8 },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  panelHeaderRow: { marginBottom: 12 },
  panelTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  faceSearchWrap: { position: 'relative' },
  faceSearchIcon: { position: 'absolute', left: 10, top: 10, zIndex: 1 },
  faceSearchInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingLeft: 30,
    paddingRight: 10,
    fontSize: 13,
    backgroundColor: '#fff',
  },
  faceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    marginBottom: 8,
  },
  faceAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceAvatarText: { fontSize: 11, fontWeight: '700', color: theme.colors.secondary },
  faceMeta: { flex: 1 },
  faceName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  faceSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  faceCount: { fontSize: 12, color: theme.colors.textSecondary },
  faceStatusBadge: { borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  faceStatusVerified: { backgroundColor: '#dcfce7' },
  faceStatusSuggested: { backgroundColor: '#fef3c7' },
  faceStatusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  faceStatusTextVerified: { color: theme.colors.success },
  faceStatusTextSuggested: { color: theme.colors.warning },
  parentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  parentIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  parentTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },
  parentDesc: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  parentSteps: { marginTop: 20, gap: 8 },
  parentStep: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  parentStepTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.text, marginTop: 6 },
  parentStepDesc: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 16 },
  parentSearchSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 16 },
  parentSearchLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 8, textAlign: 'center' },
  parentResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    marginTop: 8,
  },
  parentResultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentResultAvatarText: { fontSize: 10, fontWeight: '700', color: theme.colors.secondary },
  parentResultName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  parentResultCount: { fontSize: 12, color: theme.colors.textSecondary },
  noCampersText: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: theme.colors.text },
  modalPreview: {
    aspectRatio: 16 / 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalMetaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 12 },
  modalMeta: { fontSize: 12, color: theme.colors.textSecondary },
  modalStatusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  modalStatusTagged: { backgroundColor: '#dcfce7' },
  modalStatusPending: { backgroundColor: '#fef3c7' },
  modalStatusUntagged: { backgroundColor: '#f1f5f9' },
  modalStatusText: { fontSize: 10, fontWeight: '600', color: theme.colors.textSecondary },
  modalSectionTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  modalTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalTagAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTagAvatarText: { fontSize: 8, fontWeight: '700', color: theme.colors.secondary },
  modalTagName: { fontSize: 12, color: theme.colors.text },
  modalEmptyFaces: {
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 20,
    marginBottom: 12,
  },
  modalEmptyText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 8, marginBottom: 12 },
  modalScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalScanBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  modalCloseBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
});
