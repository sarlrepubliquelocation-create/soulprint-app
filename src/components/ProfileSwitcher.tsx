import { useState, useRef, useEffect } from 'react';
import { P, T } from './ui';
import type { UserProfile } from '../hooks/useProfiles';

interface ProfileSwitcherProps {
  profiles: UserProfile[];
  activeProfileId: string | null;
  onSwitch: (profile: UserProfile) => void;
  onAddProfile: () => void;
  onDeleteProfile: (profileId: string) => Promise<void>;
  onSetMain?: (profileId: string) => Promise<void>;
  maxProfiles?: number;
}

export default function ProfileSwitcher({
  profiles,
  activeProfileId,
  onSwitch,
  onAddProfile,
  onDeleteProfile,
  onSetMain,
  maxProfiles = 5,
}: ProfileSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingMainId, setSettingMainId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const canAddProfile = profiles.length < maxProfiles;

  const handleDeleteClick = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    const confirmed = confirm('Êtes-vous sûr de vouloir supprimer ce profil ? Cette action est irréversible.');
    if (confirmed) {
      setDeletingId(profileId);
      try {
        await onDeleteProfile(profileId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }} ref={dropdownRef}>
      {/* Current Profile Pill */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: `${P.gold}15`,
          border: `1px solid ${P.gold}44`,
          borderRadius: 20,
          cursor: 'pointer',
          fontSize: T.sm,
          color: P.gold,
          fontWeight: 600,
          fontFamily: 'inherit',
          transition: 'all 0.2s ease',
          width: '100%',
          maxWidth: 280,
          justifyContent: 'space-between',
        }}
        onMouseEnter={(e) => {
          if (!open) {
            (e.currentTarget as HTMLElement).style.background = `${P.gold}25`;
            (e.currentTarget as HTMLElement).style.borderColor = `${P.gold}66`;
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            (e.currentTarget as HTMLElement).style.background = `${P.gold}15`;
            (e.currentTarget as HTMLElement).style.borderColor = `${P.gold}44`;
          }
        }}
      >
        <span>
          {activeProfile ? (
            <>
              {activeProfile.label}
              {activeProfile.isMain && ' ★'}
            </>
          ) : (
            'Sélectionner un profil'
          )}
        </span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 8,
            background: P.surface,
            border: `1px solid ${P.gold}44`,
            borderRadius: 12,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px ${P.gold}15`,
            zIndex: 1000,
            minWidth: 280,
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {/* Profile List */}
          <div style={{ padding: 8 }}>
            {profiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => {
                  onSwitch(profile);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  marginBottom: 4,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: activeProfile?.id === profile.id ? `${P.gold}20` : 'transparent',
                  border: activeProfile?.id === profile.id ? `1px solid ${P.gold}44` : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (activeProfile?.id !== profile.id) {
                    (e.currentTarget as HTMLElement).style.background = `${P.gold}10`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeProfile?.id !== profile.id) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                <div>
                  <div style={{ fontSize: T.md, fontWeight: 600, color: P.text }}>
                    {profile.label}
                  </div>
                  <div style={{ fontSize: T.xs, color: P.textMid }}>
                    {profile.fn} {profile.ln}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {profile.isMain && (
                    <span style={{ fontSize: 12, color: P.gold }} title="Profil principal">★</span>
                  )}
                  {!profile.isMain && onSetMain && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setSettingMainId(profile.id);
                        try {
                          await onSetMain(profile.id);
                          onSwitch(profile); // basculer aussi vers ce profil
                          setOpen(false);
                        } finally {
                          setSettingMainId(null);
                        }
                      }}
                      disabled={settingMainId === profile.id}
                      title="Définir comme profil principal (ouverture par défaut)"
                      style={{
                        background: 'none',
                        border: `1px solid ${P.gold}44`,
                        borderRadius: 4,
                        color: P.gold,
                        cursor: settingMainId === profile.id ? 'not-allowed' : 'pointer',
                        fontSize: 10,
                        padding: '2px 5px',
                        opacity: settingMainId === profile.id ? 0.5 : 0.7,
                        fontFamily: 'inherit',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                    >
                      ★
                    </button>
                  )}
                  {!profile.isMain && (
                    <button
                      onClick={(e) => handleDeleteClick(e, profile.id)}
                      disabled={deletingId === profile.id}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: P.red,
                        cursor: deletingId === profile.id ? 'not-allowed' : 'pointer',
                        fontSize: 14,
                        padding: '2px 4px',
                        opacity: deletingId === profile.id ? 0.5 : 1,
                        fontFamily: 'inherit',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Profile Button */}
          {canAddProfile && (
            <>
              <div style={{ height: 1, background: `${P.gold}20` }} />
              <button
                onClick={() => {
                  setOpen(false);
                  onAddProfile();
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'none',
                  border: 'none',
                  color: P.gold,
                  cursor: 'pointer',
                  fontSize: T.sm,
                  fontWeight: 600,
                  textAlign: 'center',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `${P.gold}15`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'none';
                }}
              >
                + Ajouter un profil
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
